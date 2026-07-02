import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { EntityManager, In, IsNull, Repository } from 'typeorm'

import type {
  FinishWorkOrderRequest,
  StartWorkOrderRequest,
  WorkOrderDto,
  WorkOrderListQuery,
} from '@turbohesap/shared'

import { Product } from '../inventory/entities/product.entity'
import { WorkCenter } from './entities/work-center.entity'
import { ProductionOrder } from './entities/production-order.entity'
import { WorkOrder } from './entities/work-order.entity'
import { WorkOrderTimeLog } from './entities/work-order-time-log.entity'
import { toWorkOrderDto } from './manufacturing-order.mappers'
import { QualityChecksService } from './quality-checks.service'

@Injectable()
export class WorkOrdersService {
  constructor(
    @InjectRepository(WorkOrder) private readonly workOrders: Repository<WorkOrder>,
    @InjectRepository(WorkOrderTimeLog) private readonly timeLogs: Repository<WorkOrderTimeLog>,
    @InjectRepository(ProductionOrder) private readonly orders: Repository<ProductionOrder>,
    @InjectRepository(WorkCenter) private readonly workCenters: Repository<WorkCenter>,
    @InjectRepository(Product) private readonly products: Repository<Product>,
    private readonly quality: QualityChecksService,
  ) {}

  async list(query: WorkOrderListQuery = {}): Promise<WorkOrderDto[]> {
    const qb = this.workOrders.createQueryBuilder('w')
    if (query.manufacturingOrderId) qb.andWhere('w.manufacturingOrderId = :mo', { mo: query.manufacturingOrderId })
    if (query.workCenterId) qb.andWhere('w.workCenterId = :wc', { wc: query.workCenterId })
    if (query.status) qb.andWhere('w.status = :st', { st: query.status })
    if (query.assignedEmployeeId) qb.andWhere('w.assignedEmployeeId = :emp', { emp: query.assignedEmployeeId })
    qb.orderBy('w.createdAt', 'DESC').addOrderBy('w.sequence', 'ASC')
    return this.enrich(await qb.getMany())
  }

  async get(id: string): Promise<WorkOrderDto> {
    return (await this.enrich([await this.findOrFail(id)]))[0]
  }

  async start(id: string, input: StartWorkOrderRequest = {}): Promise<WorkOrderDto> {
    await this.workOrders.manager.transaction(async (em) => {
      const wo = await this.findOrFail(id, em)
      if (wo.status === 'in_progress') throw new BadRequestException('İş emri zaten çalışıyor')
      if (wo.status === 'done' || wo.status === 'cancelled') throw new BadRequestException('İş emri kapalı')
      if (input.employeeId) wo.assignedEmployeeId = input.employeeId
      wo.status = 'in_progress'
      if (!wo.startedAt) wo.startedAt = new Date()
      await em.save(wo)
      await this.openLog(em, wo, input)
      await this.markOrderInProgress(em, wo.manufacturingOrderId)
    })
    return this.get(id)
  }

  async pause(id: string): Promise<WorkOrderDto> {
    await this.workOrders.manager.transaction(async (em) => {
      const wo = await this.findOrFail(id, em)
      if (wo.status !== 'in_progress') throw new BadRequestException('Yalnızca çalışan iş emri duraklatılabilir')
      await this.closeLog(em, wo)
      wo.status = 'paused'
      await em.save(wo)
    })
    return this.get(id)
  }

  async resume(id: string, input: StartWorkOrderRequest = {}): Promise<WorkOrderDto> {
    await this.workOrders.manager.transaction(async (em) => {
      const wo = await this.findOrFail(id, em)
      if (wo.status !== 'paused') throw new BadRequestException('Yalnızca duraklatılmış iş emri devam ettirilebilir')
      if (input.employeeId) wo.assignedEmployeeId = input.employeeId
      wo.status = 'in_progress'
      await em.save(wo)
      await this.openLog(em, wo, input)
      await this.markOrderInProgress(em, wo.manufacturingOrderId)
    })
    return this.get(id)
  }

  async finish(id: string, input: FinishWorkOrderRequest): Promise<WorkOrderDto> {
    if (!(input.producedQuantity >= 0)) throw new BadRequestException('Üretilen miktar negatif olamaz')
    await this.workOrders.manager.transaction(async (em) => {
      const wo = await this.findOrFail(id, em)
      if (wo.status === 'done' || wo.status === 'cancelled') throw new BadRequestException('İş emri kapalı')
      if (wo.qualityCheckRequired && !(await this.quality.hasPassingCheck(wo.id, em))) {
        throw new BadRequestException('İş emri için geçen kalite kontrolü gerekli')
      }
      await this.closeLog(em, wo)
      wo.producedQuantity = input.producedQuantity
      wo.rejectedQuantity = input.rejectedQuantity ?? 0
      if (input.note) wo.notes = input.note
      wo.status = 'done'
      wo.finishedAt = new Date()
      await em.save(wo)
      // Advance the next pending operation to ready.
      const next = await em.getRepository(WorkOrder).findOne({
        where: { manufacturingOrderId: wo.manufacturingOrderId, status: 'pending' },
        order: { sequence: 'ASC' },
      })
      if (next) {
        next.status = 'ready'
        await em.save(next)
      }
      await this.markOrderInProgress(em, wo.manufacturingOrderId)
    })
    return this.get(id)
  }

  // ── internals ──────────────────────────────────────────────────────────────

  private async openLog(em: EntityManager, wo: WorkOrder, input: StartWorkOrderRequest): Promise<void> {
    await em.save(
      em.create(WorkOrderTimeLog, {
        workOrderId: wo.id,
        employeeId: input.employeeId ?? wo.assignedEmployeeId ?? null,
        startedAt: new Date(),
        endedAt: null,
        durationMinutes: 0,
        note: input.note ?? null,
      }),
    )
  }

  private async closeLog(em: EntityManager, wo: WorkOrder): Promise<void> {
    const log = await em.getRepository(WorkOrderTimeLog).findOne({
      where: { workOrderId: wo.id, endedAt: IsNull() },
      order: { startedAt: 'DESC' },
    })
    if (!log) return
    const ended = new Date()
    const minutes = Math.max(0, (ended.getTime() - log.startedAt.getTime()) / 60000)
    log.endedAt = ended
    log.durationMinutes = minutes
    await em.save(log)
    wo.actualMinutes = Number(wo.actualMinutes ?? 0) + minutes
    await em.save(wo)
  }

  private async markOrderInProgress(em: EntityManager, orderId: string): Promise<void> {
    const order = await em.getRepository(ProductionOrder).findOne({ where: { id: orderId } })
    if (order && order.status === 'confirmed') {
      order.status = 'in_progress'
      if (!order.actualStartDate) order.actualStartDate = new Date()
      await em.save(order)
    }
  }

  private async enrich(wos: WorkOrder[]): Promise<WorkOrderDto[]> {
    if (wos.length === 0) return []
    const moIds = [...new Set(wos.map((w) => w.manufacturingOrderId))]
    const wcIds = [...new Set(wos.map((w) => w.workCenterId))]
    const woIds = wos.map((w) => w.id)
    const [moRows, wcRows, logs] = await Promise.all([
      this.orders.find({ where: { id: In(moIds) }, select: { id: true, orderNo: true, productId: true } }),
      this.workCenters.find({ where: { id: In(wcIds) }, select: { id: true, name: true } }),
      this.timeLogs.find({ where: { workOrderId: In(woIds) } }),
    ])
    const moMap = new Map(moRows.map((m) => [m.id, m]))
    const wcMap = new Map(wcRows.map((w) => [w.id, w.name]))
    const productIds = [...new Set(moRows.map((m) => m.productId))]
    const products = new Map<string, string>()
    if (productIds.length) {
      const rows = await this.products.find({ where: { id: In(productIds) }, select: { id: true, name: true } })
      for (const p of rows) products.set(p.id, p.name)
    }
    const logMap = new Map<string, WorkOrderTimeLog[]>()
    for (const l of logs) {
      if (!logMap.has(l.workOrderId)) logMap.set(l.workOrderId, [])
      logMap.get(l.workOrderId)!.push(l)
    }
    return wos.map((w) => {
      const mo = moMap.get(w.manufacturingOrderId)
      return toWorkOrderDto(w, {
        manufacturingOrderNo: mo?.orderNo ?? '',
        productName: mo ? products.get(mo.productId) ?? '' : '',
        workCenterName: wcMap.get(w.workCenterId) ?? '',
        timeLogs: logMap.get(w.id) ?? [],
      })
    })
  }

  private async findOrFail(id: string, em?: EntityManager): Promise<WorkOrder> {
    const repo = em ? em.getRepository(WorkOrder) : this.workOrders
    const wo = await repo.findOne({ where: { id } })
    if (!wo) throw new NotFoundException('İş emri bulunamadı')
    return wo
  }
}
