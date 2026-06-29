import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { In, IsNull, Repository } from 'typeorm'

import {
  COUNT_REASON_LABELS,
  STOCK_COUNT_KIND_LABELS,
  type StockCountDto,
  type StockCountLineDto,
  type StockCountListQuery,
  type StockCountScanDto,
} from '@turbohesap/shared'

import { StockCount } from './entities/stock-count.entity'
import { StockCountLine } from './entities/stock-count-line.entity'
import { StockCountScan } from './entities/stock-count-scan.entity'
import { Product } from '../inventory/entities/product.entity'
import { ProductVariant } from '../inventory/entities/product-variant.entity'
import { ProductPackaging } from '../inventory/entities/product-packaging.entity'
import { ProductStock } from '../inventory/entities/product-stock.entity'
import { Branch } from '../org/entities/branch.entity'
import { User } from '../iam/entities/user.entity'
import { displayName } from '../contacts/user-name.util'
import { StockMovementsService } from '../inventory/stock-movements.service'
import { StockMovementTypesService } from '../inventory/stock-movement-types.service'
import type {
  CreateStockCountDto,
  SetCountLineDto,
  SubmitCountEntriesDto,
} from './dto/stocktake.dto'

// Stock movements posted on approve are tagged with this source so cancel can
// reverse exactly the rows this count produced.
const STOCKTAKE_SOURCE = 'stocktake'

// A flattened countable unit (a variant of a variant-product, or a simple
// product) with its snapshot fields and current on-hand.
interface CountUnit {
  productId: string
  variantId: string | null
  code: string
  name: string
  barcode: string
  unit: string
  expectedQty: number
  value: number
}

// Result of resolving a barcode to a catalog unit (inline — ProductsService is
// not exported by InventoryModule).
interface BarcodeMatch {
  productId: string
  variantId: string | null
  packQty: number
  code: string
  name: string
  unit: string
}

@Injectable()
export class StocktakeService {
  constructor(
    @InjectRepository(StockCount) private readonly counts: Repository<StockCount>,
    @InjectRepository(StockCountLine) private readonly lines: Repository<StockCountLine>,
    @InjectRepository(StockCountScan) private readonly scans: Repository<StockCountScan>,
    @InjectRepository(Product) private readonly products: Repository<Product>,
    @InjectRepository(ProductVariant) private readonly variants: Repository<ProductVariant>,
    @InjectRepository(ProductPackaging) private readonly packagings: Repository<ProductPackaging>,
    @InjectRepository(ProductStock) private readonly stocks: Repository<ProductStock>,
    @InjectRepository(Branch) private readonly branches: Repository<Branch>,
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly stockMovements: StockMovementsService,
    private readonly movementTypes: StockMovementTypesService,
  ) {}

  // ── queries ─────────────────────────────────────────────────────────────────
  async list(query?: StockCountListQuery): Promise<StockCountDto[]> {
    const qb = this.counts.createQueryBuilder('c')
    if (query?.status) qb.andWhere('c.status = :status', { status: query.status })
    if (query?.kind) qb.andWhere('c.kind = :kind', { kind: query.kind })
    if (query?.branchId) qb.andWhere('c.branchId = :branchId', { branchId: query.branchId })
    if (query?.from) qb.andWhere('c.plannedDate >= :from', { from: query.from })
    if (query?.to) qb.andWhere('c.plannedDate <= :to', { to: query.to })
    qb.orderBy('c.createdAt', 'DESC')
    const rows = await qb.getMany()
    if (rows.length === 0) return []

    const ids = rows.map((r) => r.id)
    const lines = await this.lines.find({ where: { countId: In(ids) } })
    const linesByCount = new Map<string, StockCountLine[]>()
    for (const l of lines) {
      const arr = linesByCount.get(l.countId) ?? []
      arr.push(l)
      linesByCount.set(l.countId, arr)
    }
    const [branchNames, userNames] = await Promise.all([
      this.branchNameMap(rows.map((r) => r.branchId)),
      this.userNameMap([...rows.map((r) => r.createdById), ...rows.map((r) => r.approvedById)]),
    ])
    return rows.map((r) =>
      toCountDto(r, linesByCount.get(r.id) ?? [], {
        branchName: r.branchId ? branchNames.get(r.branchId) ?? null : null,
        createdByName: userNames.get(r.createdById) ?? '',
        approvedByName: r.approvedById ? userNames.get(r.approvedById) ?? null : null,
      }),
    )
  }

  async get(id: string): Promise<StockCountDto> {
    const count = await this.findOrFail(id)
    const lines = await this.lines.find({ where: { countId: id } })
    const [branch, names] = await Promise.all([
      count.branchId ? this.branches.findOne({ where: { id: count.branchId } }) : Promise.resolve(null),
      this.userNameMap([count.createdById, count.approvedById]),
    ])
    return toCountDto(count, lines, {
      branchName: branch?.name ?? null,
      createdByName: names.get(count.createdById) ?? '',
      approvedByName: count.approvedById ? names.get(count.approvedById) ?? null : null,
    })
  }

  async lineList(id: string): Promise<StockCountLineDto[]> {
    await this.findOrFail(id)
    const lines = await this.lines.find({ where: { countId: id }, order: { name: 'ASC' } })
    return lines.map(toLineDto)
  }

  async scanList(id: string): Promise<StockCountScanDto[]> {
    await this.findOrFail(id)
    const rows = await this.scans.find({ where: { countId: id }, order: { createdAt: 'ASC' } })
    return rows.map(toScanDto)
  }

  // ── create: snapshot scoped lines ─────────────────────────────────────────────
  async create(dto: CreateStockCountDto, userId: string): Promise<StockCountDto> {
    const date = new Date().toISOString().slice(0, 10)
    const count = this.counts.create({
      kind: dto.kind,
      status: 'draft',
      branchId: dto.branchId ?? null,
      blind: dto.blind ?? false,
      name: dto.name?.trim() || `${STOCK_COUNT_KIND_LABELS[dto.kind]} ${date}`,
      plannedDate: dto.plannedDate ?? null,
      startedAt: null,
      completedAt: null,
      recountThresholdPct: dto.recountThresholdPct ?? 0,
      scopeCategoryIds: dto.scopeCategoryIds ?? [],
      scopeProductIds: dto.scopeProductIds ?? [],
      abcClass: dto.kind === 'cycle' ? (dto.abcClass ?? 'A') : null,
      allowAddUnlisted: dto.allowAddUnlisted ?? false,
      countUnscannedAsZero: dto.countUnscannedAsZero ?? false,
      createdById: userId,
      approvedById: null,
      notes: null,
    })
    const saved = await this.counts.save(count)

    const units = await this.generateUnits(saved, dto)
    if (units.length) {
      const lines = units.map((u) =>
        this.lines.create({
          countId: saved.id,
          productId: u.productId,
          variantId: u.variantId,
          code: u.code,
          name: u.name,
          barcode: u.barcode,
          unit: u.unit,
          expectedQty: u.expectedQty,
          countedQty: 0,
          reasonCode: null,
          status: 'pending',
          recountRequested: false,
          counterId: null,
          lastCountedAt: null,
          notes: null,
        }),
      )
      await this.lines.save(lines)
    }
    return this.get(saved.id)
  }

  // ── lifecycle ─────────────────────────────────────────────────────────────────
  async start(id: string): Promise<StockCountDto> {
    const count = await this.findOrFail(id)
    if (count.status !== 'draft') {
      throw new BadRequestException('Yalnızca taslak sayım başlatılabilir')
    }
    count.status = 'counting'
    count.startedAt = new Date()
    await this.counts.save(count)
    return this.get(id)
  }

  async submitEntries(
    id: string,
    dto: SubmitCountEntriesDto,
    userId: string,
  ): Promise<StockCountLineDto[]> {
    const count = await this.findOrFail(id)
    if (count.status !== 'counting') {
      throw new BadRequestException('Sayım girişi yalnızca sayımdaki bir belgeye yapılabilir')
    }
    const affected = new Map<string, StockCountLine>()
    for (const entry of dto.entries) {
      let line: StockCountLine | null = null
      let qty = entry.qty

      if (entry.lineId) {
        line = await this.lines.findOne({ where: { id: entry.lineId, countId: id } })
      } else if (entry.barcode) {
        const match = await this.resolveBarcode(entry.barcode)
        if (match) {
          qty = entry.qty * (match.packQty || 1)
          line = await this.findLine(id, match.productId, match.variantId)
          if (!line && count.allowAddUnlisted) {
            line = await this.addLine(count, match.productId, match.variantId, match)
          }
        }
      } else if (entry.productId) {
        line = await this.findLine(id, entry.productId, entry.variantId ?? null)
        if (!line && count.allowAddUnlisted) {
          line = await this.addLine(count, entry.productId, entry.variantId ?? null)
        }
      }

      if (!line) {
        throw new NotFoundException('Sayım kalemi bulunamadı (ürün listede yok)')
      }
      line.countedQty += qty
      line.status = 'counted'
      line.counterId = userId
      line.lastCountedAt = new Date()
      await this.lines.save(line)
      await this.scans.save(
        this.scans.create({ countId: id, lineId: line.id, qty, scannedById: userId }),
      )
      affected.set(line.id, line)
    }
    return [...affected.values()].map(toLineDto)
  }

  async setLine(id: string, lineId: string, dto: SetCountLineDto): Promise<StockCountLineDto> {
    await this.findOrFail(id)
    const line = await this.lineOrFail(id, lineId)
    if (dto.countedQty !== undefined) {
      line.countedQty = dto.countedQty
      line.status = 'counted'
      line.lastCountedAt = new Date()
    }
    if (dto.reasonCode !== undefined) line.reasonCode = dto.reasonCode
    if (dto.notes !== undefined) line.notes = dto.notes
    await this.lines.save(line)
    return toLineDto(line)
  }

  async review(id: string): Promise<StockCountDto> {
    const count = await this.findOrFail(id)
    if (count.status !== 'counting') {
      throw new BadRequestException('Yalnızca sayımdaki belge incelemeye alınabilir')
    }
    const lines = await this.lines.find({ where: { countId: id } })
    for (const l of lines) {
      const diff = l.countedQty - l.expectedQty
      l.recountRequested =
        l.expectedQty > 0
          ? (Math.abs(diff) / l.expectedQty) * 100 > count.recountThresholdPct
          : diff !== 0
    }
    if (lines.length) await this.lines.save(lines)
    count.status = 'review'
    await this.counts.save(count)
    return this.get(id)
  }

  async requestRecount(id: string, lineId: string): Promise<StockCountLineDto> {
    const count = await this.findOrFail(id)
    const line = await this.lineOrFail(id, lineId)
    line.status = 'recount'
    line.recountRequested = true
    await this.lines.save(line)
    if (count.status !== 'counting') {
      count.status = 'counting'
      await this.counts.save(count)
    }
    return toLineDto(line)
  }

  async approve(id: string, userId: string): Promise<StockCountDto> {
    const count = await this.findOrFail(id)
    if (count.status !== 'review') {
      throw new BadRequestException('Yalnızca incelemedeki sayım onaylanabilir')
    }
    // Segregation of duties: the counter/creator must not approve the adjustment.
    if (userId === count.createdById) {
      throw new BadRequestException(
        'Görevler ayrılığı gereği sayımı oluşturan kişi onaylayamaz; farklı bir kullanıcı onaylamalıdır',
      )
    }
    await this.counts.manager.transaction(async (em) => {
      const fazlaId = await this.movementTypes.systemTypeId('Sayım Fazlası', 'in')
      const eksikId = await this.movementTypes.systemTypeId('Sayım Eksiği', 'out')
      const lines = await em.getRepository(StockCountLine).find({ where: { countId: id } })
      const date = new Date().toISOString().slice(0, 10)
      for (const line of lines) {
        // Never-counted lines keep their expected on-hand (no movement) unless the
        // session opts to treat unscanned as zero.
        const counted =
          line.status === 'pending' && !count.countUnscannedAsZero
            ? line.expectedQty
            : line.countedQty
        const diff = counted - line.expectedQty
        if (diff === 0) continue
        const reasonLabel = line.reasonCode ? COUNT_REASON_LABELS[line.reasonCode] : 'Sayım farkı'
        await this.stockMovements.post(em, {
          productId: line.productId,
          variantId: line.variantId,
          branchId: count.branchId,
          movementTypeId: diff > 0 ? fazlaId : eksikId,
          direction: diff > 0 ? 'in' : 'out',
          quantity: Math.abs(diff),
          unit: line.unit || 'Adet',
          date,
          description: `Sayım ${count.name} — ${reasonLabel}`,
          sourceModule: STOCKTAKE_SOURCE,
          sourceId: count.id,
        })
      }
      const fresh = await em.getRepository(StockCount).findOneOrFail({ where: { id } })
      fresh.status = 'approved'
      fresh.approvedById = userId
      fresh.completedAt = new Date()
      await em.getRepository(StockCount).save(fresh)
    })
    return this.get(id)
  }

  async cancel(id: string): Promise<StockCountDto> {
    const count = await this.findOrFail(id)
    if (count.status === 'cancelled') return this.get(id)
    await this.counts.manager.transaction(async (em) => {
      if (count.status === 'approved') {
        await this.stockMovements.reverseSource(em, STOCKTAKE_SOURCE, id)
      }
      const fresh = await em.getRepository(StockCount).findOneOrFail({ where: { id } })
      fresh.status = 'cancelled'
      await em.getRepository(StockCount).save(fresh)
    })
    return this.get(id)
  }

  async remove(id: string): Promise<void> {
    const count = await this.findOrFail(id)
    if (count.status === 'approved') {
      throw new BadRequestException('İşlenmiş sayım silinemez; önce iptal edin')
    }
    await this.scans.delete({ countId: id })
    await this.lines.delete({ countId: id })
    await this.counts.remove(count)
  }

  // ── line generation ───────────────────────────────────────────────────────────
  private async generateUnits(count: StockCount, dto: CreateStockCountDto): Promise<CountUnit[]> {
    const products = await this.scopeProducts(dto)
    if (products.length === 0) return []
    const units = await this.buildUnits(products, count.branchId)
    if (count.kind !== 'cycle') return units
    return this.abcSlice(units, count.abcClass ?? 'A')
  }

  /** Candidate products for the count, by kind/scope (active, stock-tracked). */
  private async scopeProducts(dto: CreateStockCountDto): Promise<Product[]> {
    const qb = this.products
      .createQueryBuilder('p')
      .where('p.isActive = true')
      .andWhere('p.trackStock = true')
    if (dto.kind === 'partial') {
      const cats = dto.scopeCategoryIds ?? []
      const prods = dto.scopeProductIds ?? []
      if (cats.length && prods.length) {
        qb.andWhere('(p.categoryId IN (:...cats) OR p.id IN (:...prods))', { cats, prods })
      } else if (cats.length) {
        qb.andWhere('p.categoryId IN (:...cats)', { cats })
      } else if (prods.length) {
        qb.andWhere('p.id IN (:...prods)', { prods })
      } else {
        return []
      }
    }
    return qb.orderBy('p.name', 'ASC').getMany()
  }

  /** Expand products into countable units (one per active variant, or the product). */
  private async buildUnits(products: Product[], branchId: string | null): Promise<CountUnit[]> {
    const productIds = products.map((p) => p.id)
    const onHand = await this.onHandMap(productIds, branchId)
    const variantParents = products.filter((p) => p.hasVariants).map((p) => p.id)
    const variants = variantParents.length
      ? await this.variants.find({ where: { productId: In(variantParents), isActive: true } })
      : []
    const variantsByProduct = new Map<string, ProductVariant[]>()
    for (const v of variants) {
      const arr = variantsByProduct.get(v.productId) ?? []
      arr.push(v)
      variantsByProduct.set(v.productId, arr)
    }

    const units: CountUnit[] = []
    for (const p of products) {
      if (p.hasVariants) {
        for (const v of variantsByProduct.get(p.id) ?? []) {
          const expectedQty = onHand.get(`${p.id}|${v.id}`) ?? 0
          const salePrice = v.salePrice ?? p.salePrice ?? 0
          units.push({
            productId: p.id,
            variantId: v.id,
            code: v.code,
            name: `${p.name}${variantSuffix(v.attributeValues)}`,
            barcode: v.barcode || p.barcode,
            unit: p.unit,
            expectedQty,
            value: salePrice * expectedQty,
          })
        }
      } else {
        const expectedQty = onHand.get(`${p.id}|`) ?? 0
        units.push({
          productId: p.id,
          variantId: null,
          code: p.code,
          name: p.name,
          barcode: p.barcode,
          unit: p.unit,
          expectedQty,
          value: (p.salePrice ?? 0) * expectedQty,
        })
      }
    }
    return units
  }

  /** ABC slice by cumulative value: A ≤70%, B ≤90%, C rest. */
  private abcSlice(units: CountUnit[], abcClass: string): CountUnit[] {
    const sorted = [...units].sort((a, b) => b.value - a.value)
    const total = sorted.reduce((s, u) => s + u.value, 0)
    if (total <= 0) return abcClass === 'A' ? sorted : []
    const result: CountUnit[] = []
    let cum = 0
    for (const u of sorted) {
      cum += u.value
      const ratio = cum / total
      const cls = ratio <= 0.7 ? 'A' : ratio <= 0.9 ? 'B' : 'C'
      if (cls === abcClass) result.push(u)
    }
    return result
  }

  // ── helpers ─────────────────────────────────────────────────────────────────
  private async onHandMap(productIds: string[], branchId: string | null): Promise<Map<string, number>> {
    const map = new Map<string, number>()
    if (productIds.length === 0) return map
    const rows = await this.stocks.find({
      where: { productId: In(productIds), branchId: branchId ?? IsNull() },
    })
    for (const r of rows) {
      const key = `${r.productId}|${r.variantId ?? ''}`
      map.set(key, (map.get(key) ?? 0) + r.quantity)
    }
    return map
  }

  private async onHand(productId: string, variantId: string | null, branchId: string | null): Promise<number> {
    const rows = await this.stocks.find({
      where: { productId, variantId: variantId ?? IsNull(), branchId: branchId ?? IsNull() },
    })
    return rows.reduce((s, r) => s + r.quantity, 0)
  }

  private findLine(countId: string, productId: string, variantId: string | null): Promise<StockCountLine | null> {
    return this.lines.findOne({
      where: { countId, productId, variantId: variantId ?? IsNull() },
    })
  }

  /** Create a line for a unit not in the generated scope (allowAddUnlisted). */
  private async addLine(
    count: StockCount,
    productId: string,
    variantId: string | null,
    snap?: BarcodeMatch,
  ): Promise<StockCountLine> {
    const product = await this.products.findOne({ where: { id: productId } })
    const variant = variantId ? await this.variants.findOne({ where: { id: variantId } }) : null
    const expectedQty = await this.onHand(productId, variantId, count.branchId)
    const line = this.lines.create({
      countId: count.id,
      productId,
      variantId: variantId ?? null,
      code: snap?.code ?? variant?.code ?? product?.code ?? '',
      name: snap?.name ?? product?.name ?? '',
      barcode: variant?.barcode || product?.barcode || '',
      unit: snap?.unit ?? product?.unit ?? '',
      expectedQty,
      countedQty: 0,
      reasonCode: null,
      status: 'pending',
      recountRequested: false,
      counterId: null,
      lastCountedAt: null,
      notes: null,
    })
    return this.lines.save(line)
  }

  /** Resolve a barcode inline (variant → packaging → product). */
  private async resolveBarcode(code: string): Promise<BarcodeMatch | null> {
    const c = (code ?? '').trim()
    if (!c) return null

    const variant = await this.variants.findOne({ where: { barcode: c } })
    if (variant) {
      const product = await this.products.findOne({ where: { id: variant.productId } })
      return {
        productId: variant.productId,
        variantId: variant.id,
        packQty: 1,
        code: variant.code,
        name: product ? `${product.name}${variantSuffix(variant.attributeValues)}` : variant.code,
        unit: product?.unit ?? 'Adet',
      }
    }
    const pack = await this.packagings.findOne({ where: { barcode: c } })
    if (pack) {
      const product = await this.products.findOne({ where: { id: pack.productId } })
      return {
        productId: pack.productId,
        variantId: pack.variantId,
        packQty: pack.quantity,
        code: product?.code ?? pack.name,
        name: product ? `${product.name} (${pack.name})` : pack.name,
        unit: pack.unit || product?.unit || 'Adet',
      }
    }
    const product = await this.products.findOne({ where: { barcode: c } })
    if (product) {
      return {
        productId: product.id,
        variantId: null,
        packQty: 1,
        code: product.code,
        name: product.name,
        unit: product.unit,
      }
    }
    return null
  }

  private async branchNameMap(ids: Array<string | null>): Promise<Map<string, string>> {
    const unique = [...new Set(ids.filter((x): x is string => !!x))]
    const map = new Map<string, string>()
    if (unique.length === 0) return map
    for (const b of await this.branches.find({ where: { id: In(unique) } })) map.set(b.id, b.name)
    return map
  }

  private async userNameMap(ids: Array<string | null>): Promise<Map<string, string>> {
    const unique = [...new Set(ids.filter((x): x is string => !!x))]
    const map = new Map<string, string>()
    if (unique.length === 0) return map
    for (const u of await this.users.find({ where: { id: In(unique) } })) map.set(u.id, displayName(u))
    return map
  }

  private async findOrFail(id: string): Promise<StockCount> {
    const count = await this.counts.findOne({ where: { id } })
    if (!count) throw new NotFoundException('Sayım bulunamadı')
    return count
  }

  private async lineOrFail(countId: string, lineId: string): Promise<StockCountLine> {
    const line = await this.lines.findOne({ where: { id: lineId, countId } })
    if (!line) throw new NotFoundException('Sayım kalemi bulunamadı')
    return line
  }
}

/** "— Kırmızı / M" from a variant's attribute values. */
function variantSuffix(attributeValues: Record<string, string>): string {
  const parts = Object.values(attributeValues ?? {}).filter(Boolean)
  return parts.length ? ` — ${parts.join(' / ')}` : ''
}

function toLineDto(l: StockCountLine): StockCountLineDto {
  return {
    id: l.id,
    countId: l.countId,
    productId: l.productId,
    variantId: l.variantId,
    code: l.code,
    name: l.name,
    barcode: l.barcode,
    unit: l.unit,
    expectedQty: l.expectedQty,
    countedQty: l.countedQty,
    difference: l.countedQty - l.expectedQty,
    reasonCode: l.reasonCode,
    status: l.status,
    recountRequested: l.recountRequested,
    counterId: l.counterId,
    lastCountedAt: l.lastCountedAt ? l.lastCountedAt.toISOString() : null,
    notes: l.notes,
  }
}

function toScanDto(s: StockCountScan): StockCountScanDto {
  return {
    id: s.id,
    countId: s.countId,
    lineId: s.lineId,
    qty: s.qty,
    scannedById: s.scannedById,
    createdAt: s.createdAt.toISOString(),
  }
}

function toCountDto(
  c: StockCount,
  lines: StockCountLine[],
  names: { branchName: string | null; createdByName: string; approvedByName: string | null },
): StockCountDto {
  const countedCount = lines.filter((l) => l.status !== 'pending').length
  const varianceCount = lines.filter(
    (l) => l.status !== 'pending' && l.countedQty !== l.expectedQty,
  ).length
  return {
    id: c.id,
    kind: c.kind,
    status: c.status,
    branchId: c.branchId,
    branchName: names.branchName,
    blind: c.blind,
    name: c.name,
    plannedDate: c.plannedDate,
    startedAt: c.startedAt ? c.startedAt.toISOString() : null,
    completedAt: c.completedAt ? c.completedAt.toISOString() : null,
    recountThresholdPct: c.recountThresholdPct,
    scopeCategoryIds: c.scopeCategoryIds ?? [],
    scopeProductIds: c.scopeProductIds ?? [],
    abcClass: c.abcClass,
    createdById: c.createdById,
    createdByName: names.createdByName,
    approvedById: c.approvedById,
    approvedByName: names.approvedByName,
    lineCount: lines.length,
    countedCount,
    varianceCount,
    notes: c.notes,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  }
}
