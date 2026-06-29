import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { In, Repository, type EntityManager } from 'typeorm'

import {
  computeInvoiceTotals,
  computeLine,
  type CreateOrderDocumentLineInput,
  type LineInput,
  type OrderDirection,
  type OrderDocumentDto,
  type OrderDocumentLineDto,
  type OrderDocumentSummary,
  type OrderKind,
  type OrderListQuery,
} from '@turbohesap/shared'

import { OrderDocument } from './entities/order-document.entity'
import { OrderDocumentLine } from './entities/order-document-line.entity'
import { Contact } from '../contacts/entities/contact.entity'
import { Product } from '../inventory/entities/product.entity'
import { ProductVariant } from '../inventory/entities/product-variant.entity'
import { StockMovementsService } from '../inventory/stock-movements.service'
import { StockMovementTypesService } from '../inventory/stock-movement-types.service'
import { InvoicesService } from '../invoices/invoices.service'
import type { CreateInvoiceDto } from '../invoices/dto/invoice.dto'
import type {
  ConvertOrderDto,
  CreateOrderDocumentDto,
  UpdateOrderDocumentDto,
} from './dto/order.dto'

const ORDERS_DELIVERY_SOURCE = 'orders-delivery'

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(OrderDocument) private readonly docs: Repository<OrderDocument>,
    @InjectRepository(OrderDocumentLine) private readonly lines: Repository<OrderDocumentLine>,
    @InjectRepository(Product) private readonly products: Repository<Product>,
    @InjectRepository(ProductVariant) private readonly variants: Repository<ProductVariant>,
    @InjectRepository(Contact) private readonly contacts: Repository<Contact>,
    private readonly stockMovements: StockMovementsService,
    private readonly movementTypes: StockMovementTypesService,
    private readonly invoices: InvoicesService,
  ) {}

  // ── queries ───────────────────────────────────────────────────────────────
  async list(query?: OrderListQuery): Promise<OrderDocumentSummary[]> {
    const qb = this.docs.createQueryBuilder('d')
    if (query?.kind) qb.andWhere('d.kind = :kind', { kind: query.kind })
    if (query?.direction) qb.andWhere('d.direction = :direction', { direction: query.direction })
    if (query?.status) qb.andWhere('d.status = :status', { status: query.status })
    if (query?.contactId) qb.andWhere('d.contactId = :contactId', { contactId: query.contactId })
    if (query?.from) qb.andWhere('d.date >= :from', { from: query.from })
    if (query?.to) qb.andWhere('d.date <= :to', { to: query.to })
    if (query?.search) {
      qb.andWhere('(d.number ILIKE :q OR d.series ILIKE :q)', { q: `%${query.search}%` })
    }
    qb.orderBy('d.date', 'DESC').addOrderBy('d.createdAt', 'DESC')
    const rows = await qb.getMany()
    if (rows.length === 0) return []
    const names = await this.contactNameMap(rows.map((r) => r.contactId))
    return rows.map((r) => toSummary(r, names.get(r.contactId) ?? ''))
  }

  async get(id: string): Promise<OrderDocumentDto> {
    const doc = await this.findOrFail(id)
    const [lines, contact] = await Promise.all([
      this.lines.find({ where: { documentId: id }, order: { sortOrder: 'ASC' } }),
      this.contacts.findOne({ where: { id: doc.contactId } }),
    ])
    return toDocumentDto(doc, lines, contact?.name ?? null)
  }

  // ── create / update / remove ────────────────────────────────────────────────
  async create(dto: CreateOrderDocumentDto): Promise<OrderDocumentDto> {
    if (!(await this.contacts.findOne({ where: { id: dto.contactId } }))) {
      throw new NotFoundException('Cari bulunamadı')
    }
    const resolved = await this.resolveLines(dto.lines)
    const totals = computeInvoiceTotals(resolved.map((r) => r.input))
    const doc = this.docs.create({
      kind: dto.kind,
      direction: dto.direction,
      status: 'draft',
      series: dto.series?.trim() || defaultSeries(dto.kind, dto.direction, dto.date),
      number: '',
      contactId: dto.contactId,
      branchId: dto.branchId ?? null,
      date: dto.date,
      validUntil: dto.validUntil ?? null,
      dueDate: dto.dueDate ?? null,
      currencyCode: dto.currencyCode ?? 'TRY',
      exchangeRate: dto.exchangeRate ?? 1,
      notes: dto.notes ?? null,
      sourceDocId: null,
      targetDocId: null,
      invoiceId: null,
      ...totals,
    })
    const saved = await this.docs.save(doc)
    await this.lines.save(this.buildLines(saved.id, resolved))

    if (dto.confirm) return this.confirm(saved.id)
    return this.get(saved.id)
  }

  async update(id: string, dto: UpdateOrderDocumentDto): Promise<OrderDocumentDto> {
    const doc = await this.findOrFail(id)
    if (doc.status !== 'draft') {
      throw new BadRequestException('Yalnızca taslak belgeler düzenlenebilir')
    }
    if (dto.contactId && dto.contactId !== doc.contactId) {
      if (!(await this.contacts.findOne({ where: { id: dto.contactId } }))) {
        throw new NotFoundException('Cari bulunamadı')
      }
      doc.contactId = dto.contactId
    }
    if (dto.date !== undefined) doc.date = dto.date
    if (dto.validUntil !== undefined) doc.validUntil = dto.validUntil
    if (dto.dueDate !== undefined) doc.dueDate = dto.dueDate
    if (dto.branchId !== undefined) doc.branchId = dto.branchId
    if (dto.currencyCode !== undefined) doc.currencyCode = dto.currencyCode
    if (dto.exchangeRate !== undefined) doc.exchangeRate = dto.exchangeRate
    if (dto.series !== undefined) doc.series = dto.series
    if (dto.notes !== undefined) doc.notes = dto.notes

    if (dto.lines) {
      const resolved = await this.resolveLines(dto.lines)
      Object.assign(doc, computeInvoiceTotals(resolved.map((r) => r.input)))
      await this.lines.delete({ documentId: id })
      await this.lines.save(this.buildLines(id, resolved))
    }
    await this.docs.save(doc)
    return this.get(id)
  }

  async remove(id: string): Promise<void> {
    const doc = await this.findOrFail(id)
    if (doc.status !== 'draft') {
      throw new BadRequestException('Yalnızca taslak belgeler silinebilir; onaylanmışsa iptal edin')
    }
    await this.lines.delete({ documentId: id })
    await this.docs.remove(doc)
  }

  // ── confirm: assign gapless number; delivery also posts stock ───────────────
  async confirm(id: string): Promise<OrderDocumentDto> {
    await this.findOrFail(id)
    const resultId = await this.docs.manager.transaction(async (em) => {
      const docRepo = em.getRepository(OrderDocument)
      const doc = await docRepo.findOne({ where: { id } })
      if (!doc) throw new NotFoundException('Belge bulunamadı')
      if (doc.status !== 'draft') {
        throw new BadRequestException('Yalnızca taslak belgeler onaylanabilir')
      }
      // Gapless next number for (kind, direction, series); padded → lexical max = numeric max.
      const last = await docRepo
        .createQueryBuilder('d')
        .select('d.number', 'number')
        .where('d.kind = :kind AND d.direction = :direction AND d.series = :series AND d.number <> :empty', {
          kind: doc.kind,
          direction: doc.direction,
          series: doc.series,
          empty: '',
        })
        .orderBy('d.number', 'DESC')
        .limit(1)
        .getRawOne<{ number: string }>()
      const next = (last ? Number(last.number) : 0) + 1
      doc.number = String(next).padStart(9, '0')
      doc.status = doc.kind === 'delivery' ? 'shipped' : 'confirmed'
      await docRepo.save(doc)

      if (doc.kind === 'delivery') await this.postDeliveryStock(em, doc)
      return doc.id
    })
    return this.get(resultId)
  }

  /** Post a stock movement per stock-tracked line of a shipped İrsaliye. */
  private async postDeliveryStock(em: EntityManager, doc: OrderDocument): Promise<void> {
    const lines = await em.getRepository(OrderDocumentLine).find({ where: { documentId: doc.id } })
    const productIds = [...new Set(lines.map((l) => l.productId).filter((x): x is string => !!x))]
    if (productIds.length === 0) return
    const products = await em.getRepository(Product).find({ where: { id: In(productIds) } })
    const tracked = new Map(products.map((p) => [p.id, p.trackStock]))
    const isSale = doc.direction === 'sales'
    const direction = isSale ? 'out' : 'in'
    const typeId = await this.movementTypes.systemTypeId(
      isSale ? 'Satış Çıkışı' : 'Satın Alma Girişi',
      direction,
    )
    for (const line of lines) {
      if (!line.productId || tracked.get(line.productId) === false) continue
      await this.stockMovements.post(em, {
        productId: line.productId,
        variantId: line.variantId ?? null,
        branchId: doc.branchId ?? null,
        movementTypeId: typeId,
        direction,
        quantity: line.quantity,
        unit: line.unit,
        date: doc.date,
        description: `İrsaliye ${doc.series}${doc.number}`,
        sourceModule: ORDERS_DELIVERY_SOURCE,
        sourceId: doc.id,
      })
    }
  }

  // ── convert: next document in the chain, or a Fatura ────────────────────────
  async convert(id: string, dto: ConvertOrderDto): Promise<OrderDocumentDto> {
    const source = await this.findOrFail(id)
    const target = dto.toKind ?? naturalNext(source.kind)
    if (!target) throw new BadRequestException('Bu belge daha ileri dönüştürülemez')
    if (source.status === 'cancelled') throw new BadRequestException('İptal edilmiş belge dönüştürülemez')
    if (source.invoiceId) throw new BadRequestException('Bu belge zaten faturalandırılmış')

    const resultId = await this.docs.manager.transaction(async (em) => {
      const docRepo = em.getRepository(OrderDocument)
      if (target === 'invoice') {
        if (source.kind !== 'order' && source.kind !== 'delivery') {
          throw new BadRequestException('Faturaya yalnızca sipariş veya irsaliye dönüştürülebilir')
        }
        const srcLines = await em
          .getRepository(OrderDocumentLine)
          .find({ where: { documentId: id }, order: { sortOrder: 'ASC' } })
        const invoiceDto: CreateInvoiceDto = {
          type: source.direction === 'sales' ? 'sales' : 'purchase',
          date: source.date,
          contactId: source.contactId,
          branchId: source.branchId,
          currencyCode: source.currencyCode,
          exchangeRate: source.exchangeRate,
          dueDate: source.dueDate,
          notes: source.notes,
          // A shipped İrsaliye already moved stock; a direct Sipariş→Fatura must move it.
          postStock: source.kind !== 'delivery',
          lines: srcLines.map((l) => ({
            productId: l.productId,
            description: l.description,
            quantity: l.quantity,
            unit: l.unit,
            unitPrice: l.unitPrice,
            discountRate: l.discountRate,
            vatRate: l.vatRate,
            withholdingCode: l.withholdingCode,
          })),
        }
        const invoice = await this.invoices.create(invoiceDto)
        const fresh = await docRepo.findOneOrFail({ where: { id } })
        fresh.invoiceId = invoice.id
        fresh.status = 'invoiced'
        await docRepo.save(fresh)
        return id
      }

      // Document → document conversion (quote→order, order→delivery): new DRAFT.
      const srcLines = await em
        .getRepository(OrderDocumentLine)
        .find({ where: { documentId: id }, order: { sortOrder: 'ASC' } })
      const next = docRepo.create({
        kind: target,
        direction: source.direction,
        status: 'draft',
        series: defaultSeries(target, source.direction, source.date),
        number: '',
        contactId: source.contactId,
        branchId: source.branchId,
        date: source.date,
        validUntil: source.validUntil,
        dueDate: source.dueDate,
        currencyCode: source.currencyCode,
        exchangeRate: source.exchangeRate,
        notes: source.notes,
        sourceDocId: source.id,
        targetDocId: null,
        invoiceId: null,
        subtotal: source.subtotal,
        discountTotal: source.discountTotal,
        vatBase: source.vatBase,
        vatTotal: source.vatTotal,
        withholdingTotal: source.withholdingTotal,
        grandTotal: source.grandTotal,
        vatSummary: source.vatSummary ?? [],
      })
      const savedNext = await docRepo.save(next)
      await em.getRepository(OrderDocumentLine).save(
        srcLines.map((l) =>
          em.getRepository(OrderDocumentLine).create({
            documentId: savedNext.id,
            productId: l.productId,
            variantId: l.variantId,
            description: l.description,
            quantity: l.quantity,
            unit: l.unit,
            unitPrice: l.unitPrice,
            discountRate: l.discountRate,
            vatRate: l.vatRate,
            withholdingCode: l.withholdingCode,
            lineNet: l.lineNet,
            lineVat: l.lineVat,
            lineWithholding: l.lineWithholding,
            lineTotal: l.lineTotal,
            sortOrder: l.sortOrder,
          }),
        ),
      )
      const fresh = await docRepo.findOneOrFail({ where: { id } })
      fresh.targetDocId = savedNext.id
      await docRepo.save(fresh)
      return id
    })
    return this.get(resultId)
  }

  // ── cancel ──────────────────────────────────────────────────────────────────
  async cancel(id: string): Promise<OrderDocumentDto> {
    const doc = await this.findOrFail(id)
    if (doc.status === 'cancelled') return this.get(id)
    if (doc.status === 'invoiced') {
      throw new BadRequestException('Faturalandırılmış belge iptal edilemez; önce faturayı iptal edin')
    }
    await this.docs.manager.transaction(async (em) => {
      if (doc.kind === 'delivery' && doc.status === 'shipped') {
        await this.stockMovements.reverseSource(em, ORDERS_DELIVERY_SOURCE, id)
      }
      const fresh = await em.getRepository(OrderDocument).findOneOrFail({ where: { id } })
      fresh.status = 'cancelled'
      await em.getRepository(OrderDocument).save(fresh)
    })
    return this.get(id)
  }

  // ── helpers ──────────────────────────────────────────────────────────────────
  /** Resolve each input line server-side (price/name/vat from catalog). */
  private async resolveLines(inputs: CreateOrderDocumentLineInput[]): Promise<ResolvedLine[]> {
    const productIds = [...new Set(inputs.map((l) => l.productId).filter((x): x is string => !!x))]
    const variantIds = [...new Set(inputs.map((l) => l.variantId).filter((x): x is string => !!x))]
    const products = productIds.length
      ? await this.products.find({ where: { id: In(productIds) } })
      : []
    const variants = variantIds.length
      ? await this.variants.find({ where: { id: In(variantIds) } })
      : []
    const productMap = new Map(products.map((p) => [p.id, p]))
    const variantMap = new Map(variants.map((v) => [v.id, v]))

    return inputs.map((li, i) => {
      const product = li.productId ? productMap.get(li.productId) ?? null : null
      const variant = li.variantId ? variantMap.get(li.variantId) ?? null : null
      const unitPrice = li.unitPrice ?? variant?.salePrice ?? product?.salePrice ?? 0
      const description = li.description ?? product?.name ?? ''
      const vatRate = li.vatRate ?? product?.taxRate ?? 0
      const input: LineInput = {
        quantity: li.quantity,
        unitPrice,
        discountRate: li.discountRate ?? 0,
        vatRate,
        withholdingCode: li.withholdingCode ?? null,
      }
      return {
        productId: li.productId ?? null,
        variantId: li.variantId ?? null,
        description,
        unit: li.unit ?? 'Adet',
        withholdingCode: li.withholdingCode ?? null,
        sortOrder: li.sortOrder ?? i,
        input,
      }
    })
  }

  private buildLines(documentId: string, resolved: ResolvedLine[]): OrderDocumentLine[] {
    return resolved.map((r) => {
      const c = computeLine(r.input)
      return this.lines.create({
        documentId,
        productId: r.productId,
        variantId: r.variantId,
        description: r.description,
        quantity: r.input.quantity,
        unit: r.unit,
        unitPrice: r.input.unitPrice,
        discountRate: r.input.discountRate ?? 0,
        vatRate: r.input.vatRate,
        withholdingCode: r.withholdingCode,
        lineNet: c.lineNet,
        lineVat: c.lineVat,
        lineWithholding: c.lineWithholding,
        lineTotal: c.lineTotal,
        sortOrder: r.sortOrder,
      })
    })
  }

  private async contactNameMap(ids: string[]): Promise<Map<string, string>> {
    const unique = [...new Set(ids)]
    const m = new Map<string, string>()
    if (unique.length === 0) return m
    for (const c of await this.contacts.find({ where: { id: In(unique) } })) m.set(c.id, c.name)
    return m
  }

  private async findOrFail(id: string): Promise<OrderDocument> {
    const doc = await this.docs.findOne({ where: { id } })
    if (!doc) throw new NotFoundException('Belge bulunamadı')
    return doc
  }
}

interface ResolvedLine {
  productId: string | null
  variantId: string | null
  description: string
  unit: string
  withholdingCode: string | null
  sortOrder: number
  input: LineInput
}

/** The natural next document in the chain (quote → order → delivery). */
function naturalNext(kind: OrderKind): OrderKind | null {
  if (kind === 'quote') return 'order'
  if (kind === 'order') return 'delivery'
  return null
}

/** Default series by kind + direction + 2-digit year (e.g. TEK24, ASP24). */
function defaultSeries(kind: OrderKind, direction: OrderDirection, date: string): string {
  const year = (date?.slice(2, 4) || '00')
  const sales = direction === 'sales'
  const prefix =
    kind === 'quote' ? (sales ? 'TEK' : 'ATK')
    : kind === 'order' ? (sales ? 'SIP' : 'ASP')
    : (sales ? 'IRS' : 'AIR')
  return `${prefix}${year}`
}

function toLineDto(l: OrderDocumentLine): OrderDocumentLineDto {
  return {
    id: l.id,
    documentId: l.documentId,
    productId: l.productId,
    variantId: l.variantId,
    description: l.description,
    quantity: l.quantity,
    unit: l.unit,
    unitPrice: l.unitPrice,
    discountRate: l.discountRate,
    vatRate: l.vatRate,
    withholdingCode: l.withholdingCode,
    lineNet: l.lineNet,
    lineVat: l.lineVat,
    lineWithholding: l.lineWithholding,
    lineTotal: l.lineTotal,
    sortOrder: l.sortOrder,
  }
}

function toSummary(d: OrderDocument, contactName: string): OrderDocumentSummary {
  return {
    id: d.id,
    kind: d.kind,
    direction: d.direction,
    status: d.status,
    series: d.series,
    number: d.number,
    contactId: d.contactId,
    contactName,
    date: d.date,
    grandTotal: d.grandTotal,
    currencyCode: d.currencyCode,
    invoiceId: d.invoiceId,
    createdAt: d.createdAt.toISOString(),
  }
}

function toDocumentDto(
  d: OrderDocument,
  lines: OrderDocumentLine[],
  contactName: string | null,
): OrderDocumentDto {
  return {
    id: d.id,
    kind: d.kind,
    direction: d.direction,
    status: d.status,
    series: d.series,
    number: d.number,
    contactId: d.contactId,
    contact: contactName ? { id: d.contactId, name: contactName } : null,
    branchId: d.branchId,
    date: d.date,
    validUntil: d.validUntil,
    dueDate: d.dueDate,
    currencyCode: d.currencyCode,
    exchangeRate: d.exchangeRate,
    notes: d.notes,
    subtotal: d.subtotal,
    discountTotal: d.discountTotal,
    vatBase: d.vatBase,
    vatTotal: d.vatTotal,
    withholdingTotal: d.withholdingTotal,
    grandTotal: d.grandTotal,
    vatSummary: d.vatSummary ?? [],
    sourceDocId: d.sourceDocId,
    targetDocId: d.targetDocId,
    invoiceId: d.invoiceId,
    lines: lines.map(toLineDto),
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  }
}
