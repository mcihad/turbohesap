import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { EntityManager, In, IsNull, Repository } from 'typeorm'

import type {
  ApplyPlanningRequest,
  BomType,
  PlanningRunDto,
  PlanningRunListQuery,
  PlanningSuggestionDto,
  PlanningSuggestionReason,
  RunPlanningRequest,
} from '@turbohesap/shared'

import { Product } from '../inventory/entities/product.entity'
import { AvailabilityService } from '../inventory/availability.service'
import { OrderDocument } from '../orders/entities/order-document.entity'
import { OrderDocumentLine } from '../orders/entities/order-document-line.entity'
import { Bom } from './entities/bom.entity'
import { BomComponent } from './entities/bom-component.entity'
import { ReorderRule } from './entities/reorder-rule.entity'
import { PlanningRun } from './entities/planning-run.entity'
import { PlanningSuggestion } from './entities/planning-suggestion.entity'
import { ManufacturingOrdersService } from './manufacturing-orders.service'
import type { NameRef } from './production.mappers'

interface NetReq {
  productId: string
  variantId: string | null
  branchId: string | null
  qty: number
  unit: string
  reason: PlanningSuggestionReason
  sourceRef: string | null
  level: number
  type: 'manufacture' | 'purchase'
}

const MAX_DEPTH = 10

@Injectable()
export class PlanningService {
  constructor(
    @InjectRepository(PlanningRun) private readonly runs: Repository<PlanningRun>,
    @InjectRepository(PlanningSuggestion) private readonly suggestions: Repository<PlanningSuggestion>,
    @InjectRepository(ReorderRule) private readonly rules: Repository<ReorderRule>,
    @InjectRepository(Bom) private readonly boms: Repository<Bom>,
    @InjectRepository(BomComponent) private readonly components: Repository<BomComponent>,
    @InjectRepository(Product) private readonly products: Repository<Product>,
    @InjectRepository(OrderDocument) private readonly orderDocs: Repository<OrderDocument>,
    @InjectRepository(OrderDocumentLine) private readonly orderLines: Repository<OrderDocumentLine>,
    private readonly availability: AvailabilityService,
    private readonly manufacturingOrders: ManufacturingOrdersService,
  ) {}

  async list(query: PlanningRunListQuery = {}): Promise<PlanningRunDto[]> {
    const where: Record<string, unknown> = {}
    if (query.status) where.status = query.status
    const rows = await this.runs.find({ where, order: { createdAt: 'DESC' } })
    return this.enrich(rows)
  }

  async get(id: string): Promise<PlanningRunDto> {
    return (await this.enrich([await this.findOrFail(id)]))[0]
  }

  async run(input: RunPlanningRequest = {}): Promise<PlanningRunDto> {
    const branchId = input.branchId ?? null
    const includeReorder = input.includeReorder ?? true
    const includeSalesOrders = input.includeSalesOrders ?? true
    const horizonDays = input.horizonDays ?? 30

    const netReq = new Map<string, NetReq>()
    const availCache = new Map<string, number>() // remaining ATP to net against

    // Level-0 demand: reorder rules (order-up-to max) + open sales orders (MTO).
    if (includeReorder) {
      const where: Record<string, unknown> = { isActive: true }
      if (branchId) where.branchId = branchId
      for (const rule of await this.rules.find({ where })) {
        const avail = await this.atp(rule.productId, rule.variantId, rule.branchId, availCache)
        if (avail < rule.minQty) {
          await this.addDemand(
            { productId: rule.productId, variantId: rule.variantId, branchId: rule.branchId },
            rule.maxQty,
            'reorder',
            rule.id,
            0,
            netReq,
            availCache,
          )
        }
      }
    }

    if (includeSalesOrders) {
      const docs = await this.orderDocs.find({ where: { direction: 'sales', kind: 'order', status: 'confirmed' } })
      if (docs.length) {
        const lines = await this.orderLines.find({ where: { documentId: In(docs.map((d) => d.id)) } })
        const docBranch = new Map(docs.map((d) => [d.id, d.branchId]))
        for (const line of lines) {
          if (!line.productId || line.quantity <= 0) continue
          const b = branchId ?? docBranch.get(line.documentId) ?? null
          await this.addDemand(
            { productId: line.productId, variantId: line.variantId, branchId: b },
            line.quantity,
            'sales_order',
            line.id,
            0,
            netReq,
            availCache,
          )
        }
      }
    }

    // Persist run + suggestions.
    const runId = await this.runs.manager.transaction(async (em) => {
      const run = await em.save(
        em.create(PlanningRun, {
          runNo: await this.nextRunNo(),
          runDate: new Date().toISOString().slice(0, 10),
          status: 'draft',
          horizonDays,
          branchId,
          notes: input.notes ?? null,
        }),
      )
      const entries = [...netReq.values()].filter((e) => e.qty > 0.0001).sort((a, b) => a.level - b.level)
      for (const e of entries) {
        await em.save(
          em.create(PlanningSuggestion, {
            runId: run.id,
            productId: e.productId,
            variantId: e.variantId,
            branchId: e.branchId,
            suggestionType: e.type,
            reason: e.reason,
            requiredQuantity: e.qty,
            unit: e.unit,
            suggestedDate: run.runDate,
            level: e.level,
            sourceRef: e.sourceRef,
            status: 'pending',
            createdManufacturingOrderId: null,
          }),
        )
      }
      return run.id
    })
    return this.get(runId)
  }

  async apply(id: string, input: ApplyPlanningRequest = {}): Promise<PlanningRunDto> {
    const run = await this.findOrFail(id)
    if (run.status !== 'draft') throw new BadRequestException('Yalnızca taslak plan uygulanabilir')
    const only = input.suggestionIds ? new Set(input.suggestionIds) : null
    const pend = await this.suggestions.find({ where: { runId: id, status: 'pending', suggestionType: 'manufacture' } })
    for (const s of pend) {
      if (only && !only.has(s.id)) continue
      const mo = await this.manufacturingOrders.create({
        productId: s.productId,
        variantId: s.variantId,
        plannedQuantity: s.requiredQuantity,
        targetBranchId: s.branchId,
        componentSourceBranchId: s.branchId,
        sourceMode: s.reason === 'sales_order' ? 'mto' : 'mts',
        salesOrderLineId: s.reason === 'sales_order' ? s.sourceRef : null,
      } as never)
      s.status = 'applied'
      s.createdManufacturingOrderId = mo.id
      await this.suggestions.save(s)
    }
    run.status = 'applied'
    await this.runs.save(run)
    return this.get(id)
  }

  async cancel(id: string): Promise<PlanningRunDto> {
    const run = await this.findOrFail(id)
    if (run.status === 'cancelled') throw new BadRequestException('Plan zaten iptal')
    await this.runs.manager.transaction(async (em) => {
      await em.getRepository(PlanningSuggestion).update({ runId: id, status: 'pending' }, { status: 'dismissed' })
      run.status = 'cancelled'
      await em.save(run)
    })
    return this.get(id)
  }

  // ── internals ──────────────────────────────────────────────────────────────

  // Net a demand against ATP, record the net requirement, and (if manufacturable)
  // explode its BOM into dependent demand — recursively, multi-level.
  private async addDemand(
    item: { productId: string; variantId: string | null; branchId: string | null },
    qty: number,
    reason: PlanningSuggestionReason,
    sourceRef: string | null,
    level: number,
    netReq: Map<string, NetReq>,
    availCache: Map<string, number>,
    depth = 0,
  ): Promise<void> {
    if (depth > MAX_DEPTH || qty <= 0) return
    const key = this.key(item.productId, item.variantId, item.branchId)
    const avail = Math.max(0, await this.atp(item.productId, item.variantId, item.branchId, availCache))
    let net = qty
    if (avail > 0) {
      const used = Math.min(avail, qty)
      net = qty - used
      availCache.set(key, avail - used)
    }
    if (net <= 0.0001) return

    const bom = await this.findActiveBom(item.productId, item.variantId, ['manufacture', 'subcontract'])
    const type: 'manufacture' | 'purchase' = bom ? 'manufacture' : 'purchase'
    const unit = bom?.unit ?? 'ADET'

    const existing = netReq.get(key)
    if (existing) {
      existing.qty += net
      existing.level = Math.min(existing.level, level)
    } else {
      netReq.set(key, { productId: item.productId, variantId: item.variantId, branchId: item.branchId, qty: net, unit, reason, sourceRef, level, type })
    }

    if (bom) {
      const mult = net / (bom.outputQuantity || 1)
      const comps = await this.components.find({ where: { bomId: bom.id } })
      for (const c of comps) {
        if (c.applyOnVariantId && c.applyOnVariantId !== item.variantId) continue
        const compQty = c.quantity * mult * (1 + Number(c.scrapRate ?? 0))
        await this.addDemand(
          { productId: c.componentProductId, variantId: c.componentVariantId, branchId: item.branchId },
          compQty,
          'dependent_demand',
          item.productId,
          level + 1,
          netReq,
          availCache,
          depth + 1,
        )
      }
    }
  }

  private async atp(
    productId: string,
    variantId: string | null,
    branchId: string | null,
    cache: Map<string, number>,
  ): Promise<number> {
    const key = this.key(productId, variantId, branchId)
    if (cache.has(key)) return cache.get(key)!
    const a = await this.availability.get({ productId, variantId, branchId })
    cache.set(key, a.atp)
    return a.atp
  }

  private async findActiveBom(productId: string, variantId: string | null, types: BomType[]): Promise<Bom | null> {
    if (variantId) {
      const v = await this.boms.findOne({ where: { productId, variantId, isActive: true, type: In(types) } })
      if (v) return v
    }
    return this.boms.findOne({ where: { productId, variantId: IsNull(), isActive: true, type: In(types) } })
  }

  private async enrich(rows: PlanningRun[]): Promise<PlanningRunDto[]> {
    if (rows.length === 0) return []
    const sugg = await this.suggestions.find({ where: { runId: In(rows.map((r) => r.id)) }, order: { level: 'ASC', createdAt: 'ASC' } })
    const productIds = [...new Set(sugg.map((s) => s.productId))]
    const products = new Map<string, NameRef>()
    if (productIds.length) {
      const prod = await this.products.find({ where: { id: In(productIds) }, select: { id: true, name: true, code: true } })
      for (const p of prod) products.set(p.id, { name: p.name, code: p.code })
    }
    const byRun = new Map<string, PlanningSuggestion[]>()
    for (const s of sugg) {
      if (!byRun.has(s.runId)) byRun.set(s.runId, [])
      byRun.get(s.runId)!.push(s)
    }
    return rows.map((r) => ({
      id: r.id,
      runNo: r.runNo,
      runDate: r.runDate,
      status: r.status,
      horizonDays: r.horizonDays,
      branchId: r.branchId,
      notes: r.notes,
      suggestions: (byRun.get(r.id) ?? []).map((s) => this.toSuggestionDto(s, products)),
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }))
  }

  private toSuggestionDto(s: PlanningSuggestion, products: Map<string, NameRef>): PlanningSuggestionDto {
    return {
      id: s.id,
      runId: s.runId,
      productId: s.productId,
      variantId: s.variantId,
      productName: products.get(s.productId)?.name ?? '',
      productCode: products.get(s.productId)?.code ?? '',
      branchId: s.branchId,
      suggestionType: s.suggestionType,
      reason: s.reason,
      requiredQuantity: s.requiredQuantity,
      unit: s.unit,
      suggestedDate: s.suggestedDate,
      level: s.level,
      sourceRef: s.sourceRef,
      status: s.status,
      createdManufacturingOrderId: s.createdManufacturingOrderId,
      createdAt: s.createdAt.toISOString(),
    }
  }

  private key(productId: string, variantId: string | null, branchId: string | null): string {
    return `${productId}|${variantId ?? ''}|${branchId ?? ''}`
  }
  private async findOrFail(id: string): Promise<PlanningRun> {
    const r = await this.runs.findOne({ where: { id } })
    if (!r) throw new NotFoundException('Planlama koşusu bulunamadı')
    return r
  }
  private async nextRunNo(): Promise<string> {
    const n = (await this.runs.count()) + 1
    return `PLN-${String(n).padStart(5, '0')}`
  }
}
