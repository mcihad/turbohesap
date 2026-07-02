import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { EntityManager, In, Repository } from 'typeorm'

import type {
  CreateSubcontractDispatchRequest,
  ReceiveSubcontractDispatchRequest,
  SubcontractDispatchDto,
  SubcontractDispatchListQuery,
  SubcontractStockQuery,
  SubcontractStockRow,
} from '@turbohesap/shared'

import { Product } from '../inventory/entities/product.entity'
import { Contact } from '../contacts/entities/contact.entity'
import { ProductionOrder } from './entities/production-order.entity'
import { ProductionOrderComponent } from './entities/production-order-component.entity'
import { SubcontractDispatch } from './entities/subcontract-dispatch.entity'
import { SubcontractDispatchLine } from './entities/subcontract-dispatch-line.entity'
import type { CreateSubcontractDispatchDto, ReceiveSubcontractDispatchDto } from './dto/subcontract.dto'
import { toSubcontractDispatchDto } from './subcontract.mappers'
import type { NameRef } from './production.mappers'

@Injectable()
export class SubcontractDispatchesService {
  constructor(
    @InjectRepository(SubcontractDispatch) private readonly dispatches: Repository<SubcontractDispatch>,
    @InjectRepository(SubcontractDispatchLine) private readonly lines: Repository<SubcontractDispatchLine>,
    @InjectRepository(ProductionOrder) private readonly orders: Repository<ProductionOrder>,
    @InjectRepository(ProductionOrderComponent) private readonly components: Repository<ProductionOrderComponent>,
    @InjectRepository(Product) private readonly products: Repository<Product>,
    @InjectRepository(Contact) private readonly contacts: Repository<Contact>,
  ) {}

  async list(query: SubcontractDispatchListQuery = {}): Promise<SubcontractDispatchDto[]> {
    const where: Record<string, unknown> = {}
    if (query.manufacturingOrderId) where.manufacturingOrderId = query.manufacturingOrderId
    if (query.contactId) where.contactId = query.contactId
    if (query.status) where.status = query.status
    const rows = await this.dispatches.find({ where, order: { createdAt: 'DESC' } })
    return this.enrich(rows)
  }

  async get(id: string): Promise<SubcontractDispatchDto> {
    return (await this.enrich([await this.findOrFail(id)]))[0]
  }

  async create(dto: CreateSubcontractDispatchDto): Promise<SubcontractDispatchDto> {
    const order = await this.orders.findOne({ where: { id: dto.manufacturingOrderId } })
    if (!order) throw new NotFoundException('Üretim emri bulunamadı')
    if (order.type !== 'subcontract') throw new BadRequestException('Yalnızca fason üretim emri için sevk açılır')
    if (!(await this.contacts.exists({ where: { id: dto.contactId } }))) {
      throw new BadRequestException('Geçersiz fasoncu (cari)')
    }
    const id = await this.dispatches.manager.transaction(async (em) => {
      const dispatch = await em.save(
        em.create(SubcontractDispatch, {
          dispatchNo: await this.nextDispatchNo(),
          manufacturingOrderId: order.id,
          contactId: dto.contactId,
          dispatchDate: dto.dispatchDate ?? new Date().toISOString().slice(0, 10),
          expectedReturnDate: dto.expectedReturnDate ?? null,
          status: 'draft',
          serviceCost: dto.serviceCost ?? 0,
          currency: dto.currency ?? 'TRY',
          notes: dto.notes ?? null,
        }),
      )
      // Lines: explicit, or default to the MO's snapshot components.
      let inputs = dto.lines ?? []
      if (inputs.length === 0) {
        const comps = await em.getRepository(ProductionOrderComponent).find({ where: { orderId: order.id }, order: { sortOrder: 'ASC' } })
        inputs = comps.map((c) => ({
          componentProductId: c.componentProductId,
          componentVariantId: c.componentVariantId,
          sentQuantity: c.requiredQuantity,
          unit: c.unit,
        }))
      }
      for (const [i, l] of inputs.entries()) {
        await em.save(
          em.create(SubcontractDispatchLine, {
            dispatchId: dispatch.id,
            componentProductId: l.componentProductId,
            componentVariantId: l.componentVariantId ?? null,
            sentQuantity: l.sentQuantity,
            returnedQuantity: 0,
            unit: l.unit ?? 'ADET',
            sortOrder: l.sortOrder ?? i,
          }),
        )
      }
      return dispatch.id
    })
    return this.get(id)
  }

  async send(id: string): Promise<SubcontractDispatchDto> {
    const d = await this.findOrFail(id)
    if (d.status !== 'draft') throw new BadRequestException('Yalnızca taslak sevk gönderilebilir')
    d.status = 'sent'
    await this.dispatches.save(d)
    return this.get(id)
  }

  async receive(id: string, dto: ReceiveSubcontractDispatchDto): Promise<SubcontractDispatchDto> {
    const d = await this.findOrFail(id)
    if (d.status !== 'sent') throw new BadRequestException('Yalnızca sevk edilmiş belge teslim alınır')
    await this.dispatches.manager.transaction(async (em) => {
      if (dto.serviceCost !== undefined) d.serviceCost = dto.serviceCost
      d.status = 'received'
      if (dto.notes !== undefined) d.notes = dto.notes ?? null
      await em.save(d)
      if (dto.returns?.length) {
        const lineMap = new Map((await em.getRepository(SubcontractDispatchLine).find({ where: { dispatchId: id } })).map((l) => [l.id, l]))
        for (const r of dto.returns) {
          const line = lineMap.get(r.lineId)
          if (!line) continue
          line.returnedQuantity = r.returnedQuantity
          await em.save(line)
        }
      }
      await this.recomputeMoServiceCost(em, d.manufacturingOrderId)
    })
    return this.get(id)
  }

  async cancel(id: string): Promise<SubcontractDispatchDto> {
    const d = await this.findOrFail(id)
    if (d.status === 'cancelled') throw new BadRequestException('Sevk zaten iptal')
    await this.dispatches.manager.transaction(async (em) => {
      d.status = 'cancelled'
      await em.save(d)
      await this.recomputeMoServiceCost(em, d.manufacturingOrderId)
    })
    return this.get(id)
  }

  // Stock currently at subcontractors = sum over status='sent' dispatches.
  async stockAtSubcontractor(query: SubcontractStockQuery = {}): Promise<SubcontractStockRow[]> {
    const dwhere: Record<string, unknown> = { status: 'sent' }
    if (query.contactId) dwhere.contactId = query.contactId
    const sent = await this.dispatches.find({ where: dwhere })
    if (sent.length === 0) return []
    const dispatchById = new Map(sent.map((d) => [d.id, d]))
    const lineRows = await this.lines.find({ where: { dispatchId: In(sent.map((d) => d.id)) } })

    const productIds = new Set<string>()
    lineRows.forEach((l) => productIds.add(l.componentProductId))
    const products = await this.nameRefs([...productIds])
    const contactNames = await this.contactNames([...new Set(sent.map((d) => d.contactId))])

    const agg = new Map<string, SubcontractStockRow>()
    for (const l of lineRows) {
      const d = dispatchById.get(l.dispatchId)!
      const key = `${d.contactId}|${l.componentProductId}|${l.componentVariantId ?? ''}`
      const row = agg.get(key) ?? {
        contactId: d.contactId,
        contactName: contactNames.get(d.contactId) ?? '',
        componentProductId: l.componentProductId,
        componentName: products.get(l.componentProductId)?.name ?? '',
        componentCode: products.get(l.componentProductId)?.code ?? '',
        sentQuantity: 0,
        returnedQuantity: 0,
        atSubcontractor: 0,
        unit: l.unit,
      }
      row.sentQuantity += l.sentQuantity
      row.returnedQuantity += l.returnedQuantity
      row.atSubcontractor += l.sentQuantity - l.returnedQuantity
      agg.set(key, row)
    }
    return [...agg.values()]
  }

  // ── internals ──────────────────────────────────────────────────────────────

  private async recomputeMoServiceCost(em: EntityManager, orderId: string): Promise<void> {
    const received = await em.getRepository(SubcontractDispatch).find({ where: { manufacturingOrderId: orderId, status: 'received' } })
    const total = received.reduce((s, d) => s + Number(d.serviceCost ?? 0), 0)
    const order = await em.getRepository(ProductionOrder).findOne({ where: { id: orderId } })
    if (order) {
      order.subcontractServiceCost = total
      await em.save(order)
    }
  }

  private async enrich(rows: SubcontractDispatch[]): Promise<SubcontractDispatchDto[]> {
    if (rows.length === 0) return []
    const ids = rows.map((d) => d.id)
    const lineRows = await this.lines.find({ where: { dispatchId: In(ids) } })
    const productIds = new Set<string>()
    lineRows.forEach((l) => productIds.add(l.componentProductId))
    const products = await this.nameRefs([...productIds])
    const moRows = await this.orders.find({ where: { id: In([...new Set(rows.map((d) => d.manufacturingOrderId))]) }, select: { id: true, orderNo: true } })
    const moNo = new Map(moRows.map((m) => [m.id, m.orderNo]))
    const contactNames = await this.contactNames([...new Set(rows.map((d) => d.contactId))])

    const byDispatch = new Map<string, SubcontractDispatchLine[]>()
    for (const l of lineRows) {
      if (!byDispatch.has(l.dispatchId)) byDispatch.set(l.dispatchId, [])
      byDispatch.get(l.dispatchId)!.push(l)
    }
    return rows.map((d) =>
      toSubcontractDispatchDto(d, {
        lines: byDispatch.get(d.id) ?? [],
        products,
        manufacturingOrderNo: moNo.get(d.manufacturingOrderId) ?? '',
        contactName: contactNames.get(d.contactId) ?? '',
      }),
    )
  }

  private async nameRefs(ids: string[]): Promise<Map<string, NameRef>> {
    const m = new Map<string, NameRef>()
    if (ids.length === 0) return m
    const rows = await this.products.find({ where: { id: In(ids) }, select: { id: true, name: true, code: true } })
    for (const p of rows) m.set(p.id, { name: p.name, code: p.code })
    return m
  }
  private async contactNames(ids: string[]): Promise<Map<string, string>> {
    const m = new Map<string, string>()
    if (ids.length === 0) return m
    const rows = await this.contacts.find({ where: { id: In(ids) }, select: { id: true, name: true } })
    for (const c of rows) m.set(c.id, c.name)
    return m
  }
  private async findOrFail(id: string): Promise<SubcontractDispatch> {
    const d = await this.dispatches.findOne({ where: { id } })
    if (!d) throw new NotFoundException('Fason sevk bulunamadı')
    return d
  }
  private async nextDispatchNo(): Promise<string> {
    const n = (await this.dispatches.count()) + 1
    return `FS-${String(n).padStart(5, '0')}`
  }
}
