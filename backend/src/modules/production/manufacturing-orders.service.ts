import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { EntityManager, In, IsNull, Repository } from 'typeorm'

import type {
  BomType,
  CompleteManufacturingOrderRequest,
  CreateManufacturingOrderRequest,
  ManufacturingOrderDto,
  ManufacturingOrderListQuery,
  UpdateManufacturingOrderRequest,
  WorkOrderDto,
} from '@turbohesap/shared'

import { Product } from '../inventory/entities/product.entity'
import { StockMovementsService } from '../inventory/stock-movements.service'
import { StockMovementTypesService } from '../inventory/stock-movement-types.service'
import { CostService } from '../inventory/cost.service'
import { ReservationsService } from '../inventory/reservations.service'
import { Bom } from './entities/bom.entity'
import { BomComponent } from './entities/bom-component.entity'
import { BomByproduct } from './entities/bom-byproduct.entity'
import { BomOperation } from './entities/bom-operation.entity'
import { WorkCenter } from './entities/work-center.entity'
import { ProductionOrder } from './entities/production-order.entity'
import { ProductionOrderComponent } from './entities/production-order-component.entity'
import { ProductionOrderByproduct } from './entities/production-order-byproduct.entity'
import { WorkOrder } from './entities/work-order.entity'
import { WorkOrderTimeLog } from './entities/work-order-time-log.entity'
import type {
  CreateFromDemandDto,
  CreateManufacturingOrderDto,
  UpdateManufacturingOrderDto,
} from './dto/manufacturing-order.dto'
import { toManufacturingOrderDto, toWorkOrderDto } from './manufacturing-order.mappers'
import type { NameRef } from './production.mappers'

// A leaf component after phantom explosion.
interface ExplodedLeaf {
  componentProductId: string
  componentVariantId: string | null
  requiredQuantity: number
  unit: string
  scrapRate: number
  operationId: string | null
  consumptionType: 'auto' | 'manual'
  isOptional: boolean
}

const MAX_BOM_DEPTH = 10

@Injectable()
export class ManufacturingOrdersService {
  constructor(
    @InjectRepository(ProductionOrder) private readonly orders: Repository<ProductionOrder>,
    @InjectRepository(ProductionOrderComponent) private readonly components: Repository<ProductionOrderComponent>,
    @InjectRepository(ProductionOrderByproduct) private readonly byproducts: Repository<ProductionOrderByproduct>,
    @InjectRepository(WorkOrder) private readonly workOrders: Repository<WorkOrder>,
    @InjectRepository(WorkOrderTimeLog) private readonly timeLogs: Repository<WorkOrderTimeLog>,
    @InjectRepository(Bom) private readonly boms: Repository<Bom>,
    @InjectRepository(WorkCenter) private readonly workCenters: Repository<WorkCenter>,
    @InjectRepository(Product) private readonly products: Repository<Product>,
    private readonly stock: StockMovementsService,
    private readonly movementTypes: StockMovementTypesService,
    private readonly cost: CostService,
    private readonly reservations: ReservationsService,
  ) {}

  // ── queries ────────────────────────────────────────────────────────────────

  async list(query: ManufacturingOrderListQuery = {}): Promise<ManufacturingOrderDto[]> {
    const qb = this.orders.createQueryBuilder('o')
    if (query.status) qb.andWhere('o.status = :status', { status: query.status })
    if (query.productId) qb.andWhere('o.productId = :productId', { productId: query.productId })
    if (query.type) qb.andWhere('o.type = :type', { type: query.type })
    if (query.sourceMode) qb.andWhere('o.sourceMode = :sourceMode', { sourceMode: query.sourceMode })
    if (query.branchId) {
      qb.andWhere('(o.targetBranchId = :branchId OR o.componentSourceBranchId = :branchId)', { branchId: query.branchId })
    }
    if (query.search) qb.andWhere('o.orderNo ILIKE :s', { s: `%${query.search}%` })
    if (query.from) qb.andWhere('o.createdAt >= :from', { from: query.from })
    if (query.to) qb.andWhere('o.createdAt <= :to', { to: query.to })
    qb.orderBy('o.createdAt', 'DESC')
    return this.enrich(await qb.getMany())
  }

  async get(id: string): Promise<ManufacturingOrderDto> {
    return (await this.enrich([await this.findOrFail(id)]))[0]
  }

  // ── lifecycle ──────────────────────────────────────────────────────────────

  async create(dto: CreateManufacturingOrderDto): Promise<ManufacturingOrderDto> {
    const product = await this.productOrFail(dto.productId)
    // Only a manufacturable product can be a MO output. Enforced at create()
    // (not confirm()) so legacy orders on products that predate the flag —
    // default canBeManufactured=false, no backfill migration — aren't broken
    // retroactively; new orders adopt the product's role preset.
    if (!product.canBeManufactured) {
      throw new BadRequestException(`"${product.name}" üretilebilir olarak işaretlenmemiş; üretim emri çıktısı olamaz`)
    }
    if ((dto.plannedQuantity ?? 0) <= 0) throw new BadRequestException('Planlanan miktar 0’dan büyük olmalı')
    const order = this.orders.create({
      orderNo: await this.nextOrderNo(),
      productId: dto.productId,
      variantId: dto.variantId ?? null,
      bomId: dto.bomId ?? null,
      type: dto.type ?? 'standard',
      sourceMode: dto.sourceMode ?? 'mts',
      salesOrderLineId: dto.salesOrderLineId ?? null,
      plannedQuantity: dto.plannedQuantity,
      producedQuantity: 0,
      scrappedQuantity: 0,
      unit: dto.unit ?? 'ADET',
      status: 'draft',
      priority: dto.priority ?? 'normal',
      componentSourceBranchId: dto.componentSourceBranchId ?? null,
      targetBranchId: dto.targetBranchId ?? null,
      wipBranchId: dto.wipBranchId ?? null,
      subcontractorContactId: dto.subcontractorContactId ?? null,
      consumptionMode: dto.consumptionMode ?? 'backflush',
      plannedStartDate: dto.plannedStartDate ?? null,
      plannedEndDate: dto.plannedEndDate ?? null,
      dueDate: dto.dueDate ?? null,
      responsibleEmployeeId: dto.responsibleEmployeeId ?? null,
      stdMaterialCost: 0,
      stdOperationCost: 0,
      stdOverheadCost: 0,
      actualMaterialCost: 0,
      actualOperationCost: 0,
      actualOverheadCost: 0,
      subcontractServiceCost: 0,
      byproductCredit: 0,
      totalCost: 0,
      unitCost: 0,
      currency: 'TRY',
      notes: dto.notes ?? null,
    })
    const saved = await this.orders.save(order)
    return this.get(saved.id)
  }

  // Make-to-order: thin wrapper over create() forcing sourceMode='mto'.
  async createFromDemand(dto: CreateFromDemandDto): Promise<ManufacturingOrderDto> {
    return this.create({
      productId: dto.productId,
      variantId: dto.variantId ?? null,
      bomId: dto.bomId ?? null,
      plannedQuantity: dto.quantity,
      sourceMode: 'mto',
      salesOrderLineId: dto.salesOrderLineId ?? null,
      targetBranchId: dto.targetBranchId ?? null,
      componentSourceBranchId: dto.componentSourceBranchId ?? null,
      dueDate: dto.dueDate ?? null,
      priority: dto.priority,
      notes: dto.notes ?? null,
    } as CreateManufacturingOrderDto)
  }

  async update(id: string, dto: UpdateManufacturingOrderDto): Promise<ManufacturingOrderDto> {
    const order = await this.findOrFail(id)
    if (order.status !== 'draft') throw new BadRequestException('Yalnızca taslak üretim emri düzenlenebilir')
    if (dto.variantId !== undefined) order.variantId = dto.variantId ?? null
    if (dto.bomId !== undefined) order.bomId = dto.bomId ?? null
    if (dto.type !== undefined) order.type = dto.type
    if (dto.sourceMode !== undefined) order.sourceMode = dto.sourceMode
    if (dto.salesOrderLineId !== undefined) order.salesOrderLineId = dto.salesOrderLineId ?? null
    if (dto.plannedQuantity !== undefined) {
      if (dto.plannedQuantity <= 0) throw new BadRequestException('Planlanan miktar 0’dan büyük olmalı')
      order.plannedQuantity = dto.plannedQuantity
    }
    if (dto.unit !== undefined) order.unit = dto.unit
    if (dto.priority !== undefined) order.priority = dto.priority
    if (dto.componentSourceBranchId !== undefined) order.componentSourceBranchId = dto.componentSourceBranchId ?? null
    if (dto.targetBranchId !== undefined) order.targetBranchId = dto.targetBranchId ?? null
    if (dto.wipBranchId !== undefined) order.wipBranchId = dto.wipBranchId ?? null
    if (dto.subcontractorContactId !== undefined) order.subcontractorContactId = dto.subcontractorContactId ?? null
    if (dto.consumptionMode !== undefined) order.consumptionMode = dto.consumptionMode
    if (dto.plannedStartDate !== undefined) order.plannedStartDate = dto.plannedStartDate ?? null
    if (dto.plannedEndDate !== undefined) order.plannedEndDate = dto.plannedEndDate ?? null
    if (dto.dueDate !== undefined) order.dueDate = dto.dueDate ?? null
    if (dto.responsibleEmployeeId !== undefined) order.responsibleEmployeeId = dto.responsibleEmployeeId ?? null
    if (dto.notes !== undefined) order.notes = dto.notes ?? null
    await this.orders.save(order)
    return this.get(id)
  }

  async remove(id: string): Promise<void> {
    const order = await this.findOrFail(id)
    if (order.status !== 'draft' && order.status !== 'cancelled') {
      throw new BadRequestException('Yalnızca taslak/iptal üretim emri silinebilir')
    }
    await this.orders.manager.transaction(async (em) => {
      const woIds = (await em.getRepository(WorkOrder).find({ where: { manufacturingOrderId: id }, select: { id: true } })).map((w) => w.id)
      if (woIds.length) await em.getRepository(WorkOrderTimeLog).delete({ workOrderId: In(woIds) })
      await em.getRepository(WorkOrder).delete({ manufacturingOrderId: id })
      await em.getRepository(ProductionOrderComponent).delete({ orderId: id })
      await em.getRepository(ProductionOrderByproduct).delete({ orderId: id })
      await em.getRepository(ProductionOrder).delete({ id })
    })
  }

  /** Explode BOM → snapshot components/byproducts → create work orders → reserve. */
  async confirm(id: string): Promise<ManufacturingOrderDto> {
    const order = await this.findOrFail(id)
    if (order.status !== 'draft') throw new BadRequestException('Yalnızca taslak üretim emri onaylanabilir')

    await this.orders.manager.transaction(async (em) => {
      const topBom = await this.resolveBom(em, order)
      if (!topBom) throw new BadRequestException('Bu ürün için aktif reçete bulunamadı')
      const multiplier = order.plannedQuantity / (topBom.outputQuantity || 1)

      // Explode components (phantom-recursive) into leaf lines.
      const exploded: ExplodedLeaf[] = []
      const topComps = await em.getRepository(BomComponent).find({ where: { bomId: topBom.id } })
      for (const c of topComps) {
        if (c.applyOnVariantId && c.applyOnVariantId !== order.variantId) continue
        const qty = c.quantity * multiplier * (1 + Number(c.scrapRate ?? 0))
        await this.explodeComponent(
          em,
          c.componentProductId,
          c.componentVariantId,
          qty,
          { unit: c.unit, scrapRate: Number(c.scrapRate ?? 0), operationId: c.operationId ?? null, consumptionType: c.consumptionType, isOptional: c.isOptional },
          0,
          exploded,
        )
      }

      // Snapshot components + reserve non-optional auto lines.
      let stdMaterialCost = 0
      for (const [i, leaf] of exploded.entries()) {
        const unitCost = await this.cost.getUnitCost(leaf.componentProductId, leaf.componentVariantId, order.componentSourceBranchId, em)
        stdMaterialCost += leaf.requiredQuantity * unitCost
        const reserve = !leaf.isOptional && leaf.consumptionType === 'auto'
        if (reserve) {
          await this.reservations.reserveTxn(em, {
            productId: leaf.componentProductId,
            variantId: leaf.componentVariantId,
            branchId: order.componentSourceBranchId,
            quantity: leaf.requiredQuantity,
            sourceModule: 'production',
            sourceId: order.id,
          })
        }
        await em.save(
          em.create(ProductionOrderComponent, {
            orderId: order.id,
            componentProductId: leaf.componentProductId,
            componentVariantId: leaf.componentVariantId,
            requiredQuantity: leaf.requiredQuantity,
            reservedQuantity: reserve ? leaf.requiredQuantity : 0,
            consumedQuantity: 0,
            unit: leaf.unit,
            scrapRate: leaf.scrapRate,
            operationId: leaf.operationId,
            sourceBranchId: order.componentSourceBranchId,
            consumptionType: leaf.consumptionType,
            isOptional: leaf.isOptional,
            unitCost: null,
            totalCost: null,
            sortOrder: i,
          }),
        )
      }

      // Snapshot by-products (scaled).
      const byps = await em.getRepository(BomByproduct).find({ where: { bomId: topBom.id } })
      for (const [i, b] of byps.entries()) {
        await em.save(
          em.create(ProductionOrderByproduct, {
            orderId: order.id,
            productId: b.productId,
            variantId: b.variantId,
            quantity: b.quantity * multiplier,
            producedQuantity: 0,
            unit: b.unit,
            costShareRate: b.costShareRate,
            unitCost: null,
            sortOrder: i,
          }),
        )
      }

      // Create work orders from operations (top BOM only).
      const ops = await em.getRepository(BomOperation).find({ where: { bomId: topBom.id }, order: { sequence: 'ASC' } })
      const wcMap = await this.workCenterMap(em, ops.map((o) => o.workCenterId))
      let stdOperationCost = 0
      for (const [i, op] of ops.entries()) {
        const wc = wcMap.get(op.workCenterId)
        const efficiency = wc && wc.efficiencyRate > 0 ? wc.efficiencyRate : 1
        const rawRun = op.timeBasis === 'fixed' ? op.timePerUnitMinutes : op.timePerUnitMinutes * order.plannedQuantity
        const plannedRunMinutes = rawRun / efficiency
        const plannedSetupMinutes = op.setupTimeMinutes
        stdOperationCost += ((plannedSetupMinutes + plannedRunMinutes) / 60) * (wc?.costPerHour ?? 0)
        await em.save(
          em.create(WorkOrder, {
            manufacturingOrderId: order.id,
            operationId: op.id,
            sequence: op.sequence,
            name: op.name,
            workCenterId: op.workCenterId,
            status: i === 0 ? 'ready' : 'pending',
            plannedQuantity: order.plannedQuantity,
            producedQuantity: 0,
            rejectedQuantity: 0,
            unit: order.unit,
            plannedSetupMinutes,
            plannedRunMinutes,
            actualMinutes: 0,
            qualityCheckRequired: op.qualityCheckRequired,
          }),
        )
      }

      order.bomId = topBom.id
      order.bomCode = topBom.code
      order.bomVersion = topBom.version
      order.stdMaterialCost = stdMaterialCost
      order.stdOperationCost = stdOperationCost
      order.stdOverheadCost = 0
      order.status = 'confirmed'
      await em.save(order)
    })
    return this.get(id)
  }

  /** Backflush/manual consume + produce-in + AVCO rollup + release reservations. */
  async complete(id: string, dto: CompleteManufacturingOrderRequest): Promise<ManufacturingOrderDto> {
    const order = await this.findOrFail(id)
    if (order.status !== 'confirmed' && order.status !== 'in_progress') {
      throw new BadRequestException('Yalnızca onaylı/üretimdeki emir tamamlanabilir')
    }
    const produced = dto.producedQuantity
    if (!(produced > 0)) throw new BadRequestException('Üretilen miktar 0’dan büyük olmalı')
    const scrapped = dto.scrappedQuantity ?? 0
    if (scrapped < 0) throw new BadRequestException('Fire miktarı negatif olamaz')
    const date = dto.date ?? new Date().toISOString().slice(0, 10)

    const consumeTypeId = await this.movementTypes.systemTypeId('Üretime Sarf', 'out')
    const produceTypeId = await this.movementTypes.systemTypeId('Üretimden Giriş', 'in')

    await this.orders.manager.transaction(async (em) => {
      const planned = order.plannedQuantity || produced
      const attemptRatio = planned > 0 ? (produced + scrapped) / planned : 1
      const yieldRatio = planned > 0 ? produced / planned : 1

      // 1) Consume components.
      const comps = await em.getRepository(ProductionOrderComponent).find({ where: { orderId: id } })
      // By-products loaded up front too, so a single `tracked` map can gate
      // every stock.post below. A BOM may legitimately contain non-stocked
      // items (a service/pizza-base) and the output may be non-stocked — those
      // must NOT generate phantom movements, but their cost bookkeeping still
      // runs so AVCO rollup stays correct.
      const byps = await em.getRepository(ProductionOrderByproduct).find({ where: { orderId: id } })
      const trackedIds = [
        ...new Set([...comps.map((c) => c.componentProductId), ...byps.map((b) => b.productId), order.productId]),
      ]
      const trackedRows = await em.getRepository(Product).find({ where: { id: In(trackedIds) } })
      const tracked = new Map(trackedRows.map((p) => [p.id, p.trackStock]))

      const overrides = new Map((dto.componentConsumptions ?? []).map((c) => [c.componentId, c.consumedQuantity]))
      let materialCost = 0
      for (const c of comps) {
        const consumeQty = overrides.has(c.id) ? overrides.get(c.id)! : c.requiredQuantity * attemptRatio
        if (consumeQty <= 0) continue
        const unitCost = await this.cost.getUnitCost(c.componentProductId, c.componentVariantId, c.sourceBranchId, em)
        if (tracked.get(c.componentProductId) !== false) {
          await this.stock.post(em, {
            productId: c.componentProductId,
            variantId: c.componentVariantId,
            branchId: c.sourceBranchId,
            movementTypeId: consumeTypeId,
            direction: 'out',
            quantity: consumeQty,
            unit: c.unit,
            date,
            unitCost,
            description: `Üretime sarf — ${order.orderNo}`,
            sourceModule: 'production',
            sourceId: order.id,
          })
        }
        materialCost += consumeQty * unitCost
        c.consumedQuantity = consumeQty
        c.unitCost = unitCost
        c.totalCost = consumeQty * unitCost
        await em.save(c)
      }

      // 2) Operation cost from work orders (actual minutes, else planned).
      const wos = await em.getRepository(WorkOrder).find({ where: { manufacturingOrderId: id } })
      const wcMap = await this.workCenterMap(em, wos.map((w) => w.workCenterId))
      let operationCost = 0
      for (const w of wos) {
        const minutes = w.actualMinutes > 0 ? w.actualMinutes : w.plannedSetupMinutes + w.plannedRunMinutes
        operationCost += (minutes / 60) * (wcMap.get(w.workCenterId)?.costPerHour ?? 0)
      }
      // Subcontract (fason) service fee is part of the conversion cost.
      operationCost += Number(order.subcontractServiceCost ?? 0)

      const overheadCost = 0
      const grossCost = materialCost + operationCost + overheadCost

      // 3) By-products: receive into stock, credit their cost share.
      const bypOverrides = new Map((dto.byproductOutputs ?? []).map((b) => [b.byproductId, b.quantity]))
      let byproductCredit = 0
      for (const b of byps) {
        const outQty = bypOverrides.has(b.id) ? bypOverrides.get(b.id)! : b.quantity * yieldRatio
        const credit = Number(b.costShareRate ?? 0) * grossCost
        byproductCredit += credit
        b.producedQuantity = outQty
        b.unitCost = outQty > 0 ? credit / outQty : 0
        await em.save(b)
        if (outQty > 0 && tracked.get(b.productId) !== false) {
          await this.stock.post(em, {
            productId: b.productId,
            variantId: b.variantId,
            branchId: order.targetBranchId,
            movementTypeId: produceTypeId,
            direction: 'in',
            quantity: outQty,
            unit: b.unit,
            date,
            unitCost: b.unitCost,
            description: `Yan ürün — ${order.orderNo}`,
            sourceModule: 'production',
            sourceId: order.id,
          })
        }
      }

      // 4) Finished good receipt at rolled-up unit cost (updates its AVCO).
      // A non-stocked output (e.g. a made-to-order item) posts no movement.
      const producedUnitCost = produced > 0 ? (grossCost - byproductCredit) / produced : 0
      if (tracked.get(order.productId) !== false) {
        await this.stock.post(em, {
          productId: order.productId,
          variantId: order.variantId,
          branchId: order.targetBranchId,
          movementTypeId: produceTypeId,
          direction: 'in',
          quantity: produced,
          unit: order.unit,
          date,
          unitCost: producedUnitCost,
          description: `Üretimden giriş — ${order.orderNo}`,
          sourceModule: 'production',
          sourceId: order.id,
        })
      }

      // 5) Release reservations (mark consumed) + close open work orders.
      await this.reservations.releaseSourceTxn(em, 'production', order.id, 'consumed')
      for (const w of wos) {
        if (w.status !== 'done' && w.status !== 'cancelled') {
          w.status = 'done'
          if (!w.finishedAt) w.finishedAt = new Date()
          if (Number(w.producedQuantity ?? 0) === 0) w.producedQuantity = produced
          await em.save(w)
        }
      }

      order.producedQuantity = produced
      order.scrappedQuantity = scrapped
      order.actualMaterialCost = materialCost
      order.actualOperationCost = operationCost
      order.actualOverheadCost = overheadCost
      order.byproductCredit = byproductCredit
      order.totalCost = grossCost - byproductCredit
      order.unitCost = producedUnitCost
      order.status = 'done'
      if (!order.actualStartDate) order.actualStartDate = new Date()
      order.actualEndDate = new Date()
      if (dto.notes !== undefined && dto.notes !== null) order.notes = dto.notes
      await em.save(order)
    })
    return this.get(id)
  }

  /** Reverse any stock movements + release reservations. */
  async cancel(id: string): Promise<ManufacturingOrderDto> {
    const order = await this.findOrFail(id)
    if (order.status === 'done') throw new BadRequestException('Tamamlanmış emir iptal edilemez')
    if (order.status === 'cancelled') throw new BadRequestException('Emir zaten iptal')
    await this.orders.manager.transaction(async (em) => {
      await this.stock.reverseSource(em, 'production', order.id)
      await this.reservations.releaseSourceTxn(em, 'production', order.id, 'released')
      await em.getRepository(WorkOrder).update({ manufacturingOrderId: id }, { status: 'cancelled' })
      order.status = 'cancelled'
      await em.save(order)
    })
    return this.get(id)
  }

  // ── internals ────────────────────────────────────────────────────────────────

  private async resolveBom(em: EntityManager, order: ProductionOrder): Promise<Bom | null> {
    if (order.bomId) {
      const explicit = await em.getRepository(Bom).findOne({ where: { id: order.bomId } })
      if (explicit) return explicit
    }
    return this.findActiveBom(em, order.productId, order.variantId, ['manufacture', 'subcontract'])
  }

  private async findActiveBom(
    em: EntityManager,
    productId: string,
    variantId: string | null,
    types: BomType[],
  ): Promise<Bom | null> {
    const repo = em.getRepository(Bom)
    if (variantId) {
      const v = await repo.findOne({ where: { productId, variantId, isActive: true, type: In(types) } })
      if (v) return v
    }
    return repo.findOne({ where: { productId, variantId: IsNull(), isActive: true, type: In(types) } })
  }

  // Recursively expand phantom (kit) sub-assemblies into leaf components.
  private async explodeComponent(
    em: EntityManager,
    productId: string,
    variantId: string | null,
    qty: number,
    ctx: { unit: string; scrapRate: number; operationId: string | null; consumptionType: 'auto' | 'manual'; isOptional: boolean },
    depth: number,
    acc: ExplodedLeaf[],
  ): Promise<void> {
    const phantom = depth < MAX_BOM_DEPTH ? await this.findActiveBom(em, productId, variantId, ['phantom']) : null
    if (phantom) {
      const mult = qty / (phantom.outputQuantity || 1)
      const subs = await em.getRepository(BomComponent).find({ where: { bomId: phantom.id } })
      for (const sc of subs) {
        if (sc.applyOnVariantId && sc.applyOnVariantId !== variantId) continue
        const subQty = sc.quantity * mult * (1 + Number(sc.scrapRate ?? 0))
        await this.explodeComponent(
          em,
          sc.componentProductId,
          sc.componentVariantId,
          subQty,
          { unit: sc.unit, scrapRate: Number(sc.scrapRate ?? 0), operationId: null, consumptionType: sc.consumptionType, isOptional: sc.isOptional },
          depth + 1,
          acc,
        )
      }
    } else {
      acc.push({
        componentProductId: productId,
        componentVariantId: variantId ?? null,
        requiredQuantity: qty,
        unit: ctx.unit,
        scrapRate: ctx.scrapRate,
        operationId: ctx.operationId,
        consumptionType: ctx.consumptionType,
        isOptional: ctx.isOptional,
      })
    }
  }

  private async workCenterMap(em: EntityManager, ids: string[]): Promise<Map<string, WorkCenter>> {
    const unique = [...new Set(ids)]
    if (unique.length === 0) return new Map()
    const rows = await em.getRepository(WorkCenter).find({ where: { id: In(unique) } })
    return new Map(rows.map((w) => [w.id, w]))
  }

  private async enrich(orders: ProductionOrder[]): Promise<ManufacturingOrderDto[]> {
    if (orders.length === 0) return []
    const ids = orders.map((o) => o.id)
    const [comps, byps, wos] = await Promise.all([
      this.components.find({ where: { orderId: In(ids) } }),
      this.byproducts.find({ where: { orderId: In(ids) } }),
      this.workOrders.find({ where: { manufacturingOrderId: In(ids) } }),
    ])
    const woIds = wos.map((w) => w.id)
    const logs = woIds.length ? await this.timeLogs.find({ where: { workOrderId: In(woIds) } }) : []

    const productIds = new Set<string>()
    orders.forEach((o) => productIds.add(o.productId))
    comps.forEach((c) => productIds.add(c.componentProductId))
    byps.forEach((b) => productIds.add(b.productId))
    const products = new Map<string, NameRef>()
    if (productIds.size) {
      const rows = await this.products.find({ where: { id: In([...productIds]) }, select: { id: true, name: true, code: true } })
      for (const p of rows) products.set(p.id, { name: p.name, code: p.code })
    }
    const wcNames = new Map<string, string>()
    const wcIds = [...new Set(wos.map((w) => w.workCenterId))]
    if (wcIds.length) {
      const rows = await this.workCenters.find({ where: { id: In(wcIds) }, select: { id: true, name: true } })
      for (const w of rows) wcNames.set(w.id, w.name)
    }

    const byOrder = <T extends { orderId?: string; manufacturingOrderId?: string }>(rows: T[], key: 'orderId' | 'manufacturingOrderId') => {
      const m = new Map<string, T[]>()
      for (const r of rows) {
        const k = r[key] as string
        if (!m.has(k)) m.set(k, [])
        m.get(k)!.push(r)
      }
      return m
    }
    const compMap = byOrder(comps, 'orderId')
    const bypMap = byOrder(byps, 'orderId')
    const woMap = byOrder(wos, 'manufacturingOrderId')
    const logMap = new Map<string, WorkOrderTimeLog[]>()
    for (const l of logs) {
      if (!logMap.has(l.workOrderId)) logMap.set(l.workOrderId, [])
      logMap.get(l.workOrderId)!.push(l)
    }

    return orders.map((o) => {
      const productName = products.get(o.productId)?.name ?? ''
      const woDtos: WorkOrderDto[] = (woMap.get(o.id) ?? []).map((w) =>
        toWorkOrderDto(w, {
          manufacturingOrderNo: o.orderNo,
          productName,
          workCenterName: wcNames.get(w.workCenterId) ?? '',
          timeLogs: logMap.get(w.id) ?? [],
        }),
      )
      return toManufacturingOrderDto(o, {
        components: compMap.get(o.id) ?? [],
        byproducts: bypMap.get(o.id) ?? [],
        workOrders: woDtos,
        products,
      })
    })
  }

  private async findOrFail(id: string): Promise<ProductionOrder> {
    const o = await this.orders.findOne({ where: { id } })
    if (!o) throw new NotFoundException('Üretim emri bulunamadı')
    return o
  }
  private async productOrFail(id: string): Promise<Product> {
    const p = await this.products.findOne({ where: { id } })
    if (!p) throw new NotFoundException('Ürün bulunamadı')
    return p
  }
  private async nextOrderNo(): Promise<string> {
    const n = (await this.orders.count()) + 1
    return `UE-${String(n).padStart(5, '0')}`
  }
}
