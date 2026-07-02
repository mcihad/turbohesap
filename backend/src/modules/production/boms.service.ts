import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { EntityManager, In, Repository } from 'typeorm'

import type { BomDto, BomListQuery } from '@turbohesap/shared'

import { Product } from '../inventory/entities/product.entity'
import { Bom } from './entities/bom.entity'
import { BomComponent } from './entities/bom-component.entity'
import { BomByproduct } from './entities/bom-byproduct.entity'
import { BomOperation } from './entities/bom-operation.entity'
import { WorkCenter } from './entities/work-center.entity'
import type { CreateBomDto, UpdateBomDto } from './dto/bom.dto'
import { toBomDto, type NameRef } from './production.mappers'

@Injectable()
export class BomsService {
  constructor(
    @InjectRepository(Bom) private readonly boms: Repository<Bom>,
    @InjectRepository(BomComponent) private readonly components: Repository<BomComponent>,
    @InjectRepository(BomByproduct) private readonly byproducts: Repository<BomByproduct>,
    @InjectRepository(BomOperation) private readonly operations: Repository<BomOperation>,
    @InjectRepository(Product) private readonly products: Repository<Product>,
    @InjectRepository(WorkCenter) private readonly workCenters: Repository<WorkCenter>,
  ) {}

  async list(query: BomListQuery = {}): Promise<BomDto[]> {
    const qb = this.boms.createQueryBuilder('b')
    if (query.productId) qb.andWhere('b.productId = :p', { p: query.productId })
    if (query.type) qb.andWhere('b.type = :t', { t: query.type })
    if (query.isActive !== undefined) qb.andWhere('b.isActive = :a', { a: query.isActive })
    if (query.search) qb.andWhere('(b.code ILIKE :s OR b.name ILIKE :s)', { s: `%${query.search}%` })
    qb.orderBy('b.createdAt', 'DESC')
    const headers = await qb.getMany()
    return this.enrich(headers)
  }

  async get(id: string): Promise<BomDto> {
    const bom = await this.findOrFail(id)
    return (await this.enrich([bom]))[0]
  }

  async create(dto: CreateBomDto): Promise<BomDto> {
    await this.productOrFail(dto.productId)
    const code = (dto.code ?? '').trim() || (await this.nextCode())
    if (await this.boms.exists({ where: { code } })) {
      throw new ConflictException('Bu reçete kodu zaten kullanılıyor')
    }
    const id = await this.boms.manager.transaction(async (em) => {
      const bom = await em.save(
        em.create(Bom, {
          productId: dto.productId,
          variantId: dto.variantId ?? null,
          code,
          name: (dto.name ?? '').trim(),
          type: dto.type ?? 'manufacture',
          outputQuantity: dto.outputQuantity ?? 1,
          unit: dto.unit ?? 'ADET',
          version: 1,
          revision: dto.revision ?? null,
          validFrom: dto.validFrom ?? null,
          validTo: dto.validTo ?? null,
          consumptionPolicy: dto.consumptionPolicy ?? 'warn',
          manufLeadTimeDays: dto.manufLeadTimeDays ?? null,
          isActive: dto.isActive ?? true,
          notes: dto.notes ?? null,
        }),
      )
      if (bom.isActive) await this.deactivateOthers(em, bom)
      await this.writeChildren(em, bom.id, dto)
      return bom.id
    })
    return this.get(id)
  }

  async update(id: string, dto: UpdateBomDto): Promise<BomDto> {
    const bom = await this.findOrFail(id)
    await this.boms.manager.transaction(async (em) => {
      if (dto.code !== undefined && dto.code.trim() && dto.code.trim() !== bom.code) {
        if (await em.getRepository(Bom).exists({ where: { code: dto.code.trim() } })) {
          throw new ConflictException('Bu reçete kodu zaten kullanılıyor')
        }
        bom.code = dto.code.trim()
      }
      if (dto.name !== undefined) bom.name = dto.name.trim()
      if (dto.type !== undefined) bom.type = dto.type
      if (dto.outputQuantity !== undefined) bom.outputQuantity = dto.outputQuantity
      if (dto.unit !== undefined) bom.unit = dto.unit
      if (dto.variantId !== undefined) bom.variantId = dto.variantId ?? null
      if (dto.revision !== undefined) bom.revision = dto.revision ?? null
      if (dto.validFrom !== undefined) bom.validFrom = dto.validFrom ?? null
      if (dto.validTo !== undefined) bom.validTo = dto.validTo ?? null
      if (dto.consumptionPolicy !== undefined) bom.consumptionPolicy = dto.consumptionPolicy
      if (dto.manufLeadTimeDays !== undefined) bom.manufLeadTimeDays = dto.manufLeadTimeDays ?? null
      if (dto.isActive !== undefined) bom.isActive = dto.isActive
      if (dto.notes !== undefined) bom.notes = dto.notes ?? null
      await em.save(bom)
      if (bom.isActive) await this.deactivateOthers(em, bom)

      // Replace child rows only when the caller sent them.
      if (dto.components !== undefined || dto.byproducts !== undefined || dto.operations !== undefined) {
        await em.getRepository(BomComponent).delete({ bomId: id })
        await em.getRepository(BomByproduct).delete({ bomId: id })
        await em.getRepository(BomOperation).delete({ bomId: id })
        await this.writeChildren(em, id, dto)
      }
    })
    return this.get(id)
  }

  async remove(id: string): Promise<void> {
    await this.findOrFail(id)
    await this.boms.manager.transaction(async (em) => {
      await em.getRepository(BomComponent).delete({ bomId: id })
      await em.getRepository(BomByproduct).delete({ bomId: id })
      await em.getRepository(BomOperation).delete({ bomId: id })
      await em.getRepository(Bom).delete({ id })
    })
  }

  // ── internals ────────────────────────────────────────────────────────────────

  // Write operations first (to get ids), then components/byproducts. Components
  // reference an operation by its `sequence` (`operationRef`); resolve to the id.
  private async writeChildren(
    em: EntityManager,
    bomId: string,
    dto: { components?: CreateBomDto['components']; byproducts?: CreateBomDto['byproducts']; operations?: CreateBomDto['operations'] },
  ): Promise<void> {
    const seqToOpId = new Map<number, string>()
    for (const [i, op] of (dto.operations ?? []).entries()) {
      const saved = await em.save(
        em.create(BomOperation, {
          bomId,
          sequence: op.sequence,
          name: op.name.trim(),
          workCenterId: op.workCenterId,
          setupTimeMinutes: op.setupTimeMinutes ?? 0,
          timePerUnitMinutes: op.timePerUnitMinutes ?? 0,
          timeBasis: op.timeBasis ?? 'per_unit',
          instructions: op.instructions ?? null,
          qualityCheckRequired: op.qualityCheckRequired ?? false,
          sortOrder: op.sortOrder ?? i,
        }),
      )
      seqToOpId.set(op.sequence, saved.id)
    }
    for (const [i, c] of (dto.components ?? []).entries()) {
      await em.save(
        em.create(BomComponent, {
          bomId,
          componentProductId: c.componentProductId,
          componentVariantId: c.componentVariantId ?? null,
          quantity: c.quantity,
          unit: c.unit ?? 'ADET',
          scrapRate: c.scrapRate ?? 0,
          operationId: c.operationRef != null ? seqToOpId.get(c.operationRef) ?? null : null,
          consumptionType: c.consumptionType ?? 'auto',
          isOptional: c.isOptional ?? false,
          applyOnVariantId: c.applyOnVariantId ?? null,
          notes: c.notes ?? null,
          sortOrder: c.sortOrder ?? i,
        }),
      )
    }
    for (const [i, b] of (dto.byproducts ?? []).entries()) {
      await em.save(
        em.create(BomByproduct, {
          bomId,
          productId: b.productId,
          variantId: b.variantId ?? null,
          quantity: b.quantity,
          unit: b.unit ?? 'ADET',
          costShareRate: b.costShareRate ?? 0,
          sortOrder: b.sortOrder ?? i,
        }),
      )
    }
  }

  // Only one active BOM per (product, variant). Explicit query builder so the
  // null-variant case is matched as `variant_id IS NULL` (not omitted).
  private async deactivateOthers(em: EntityManager, bom: Bom): Promise<void> {
    const qb = em
      .getRepository(Bom)
      .createQueryBuilder()
      .update(Bom)
      .set({ isActive: false })
      .where('product_id = :pid AND is_active = true AND id != :id', { pid: bom.productId, id: bom.id })
    if (bom.variantId) qb.andWhere('variant_id = :vid', { vid: bom.variantId })
    else qb.andWhere('variant_id IS NULL')
    await qb.execute()
  }

  private async enrich(headers: Bom[]): Promise<BomDto[]> {
    if (headers.length === 0) return []
    const ids = headers.map((h) => h.id)
    const [comps, byps, ops] = await Promise.all([
      this.components.find({ where: { bomId: In(ids) } }),
      this.byproducts.find({ where: { bomId: In(ids) } }),
      this.operations.find({ where: { bomId: In(ids) } }),
    ])
    const productIds = new Set<string>()
    headers.forEach((h) => productIds.add(h.productId))
    comps.forEach((c) => productIds.add(c.componentProductId))
    byps.forEach((b) => productIds.add(b.productId))
    const wcIds = [...new Set(ops.map((o) => o.workCenterId))]

    const products = new Map<string, NameRef>()
    if (productIds.size) {
      const rows = await this.products.find({ where: { id: In([...productIds]) }, select: { id: true, name: true, code: true } })
      for (const p of rows) products.set(p.id, { name: p.name, code: p.code })
    }
    const workCenters = new Map<string, string>()
    if (wcIds.length) {
      const rows = await this.workCenters.find({ where: { id: In(wcIds) }, select: { id: true, name: true } })
      for (const w of rows) workCenters.set(w.id, w.name)
    }

    const byBom = (rows: { bomId: string }[]) => {
      const m = new Map<string, any[]>()
      for (const r of rows) (m.get(r.bomId) ?? m.set(r.bomId, []).get(r.bomId)!).push(r)
      return m
    }
    const compMap = byBom(comps)
    const bypMap = byBom(byps)
    const opMap = byBom(ops)

    return headers.map((h) =>
      toBomDto(h, {
        components: compMap.get(h.id) ?? [],
        byproducts: bypMap.get(h.id) ?? [],
        operations: opMap.get(h.id) ?? [],
        products,
        workCenters,
      }),
    )
  }

  private async findOrFail(id: string): Promise<Bom> {
    const b = await this.boms.findOne({ where: { id } })
    if (!b) throw new NotFoundException('Reçete bulunamadı')
    return b
  }
  private async productOrFail(id: string): Promise<Product> {
    const p = await this.products.findOne({ where: { id } })
    if (!p) throw new NotFoundException('Ürün bulunamadı')
    return p
  }
  private async nextCode(): Promise<string> {
    const n = (await this.boms.count()) + 1
    return `BOM-${String(n).padStart(4, '0')}`
  }
}
