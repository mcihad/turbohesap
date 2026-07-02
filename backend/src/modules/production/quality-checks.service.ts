import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { EntityManager, In, Repository } from 'typeorm'

import type { QualityCheckDto, QualityCheckListQuery } from '@turbohesap/shared'

import { ProductionOrder } from './entities/production-order.entity'
import { QualityCheck } from './entities/quality-check.entity'
import type { RecordQualityCheckDto } from './dto/quality.dto'

@Injectable()
export class QualityChecksService {
  constructor(
    @InjectRepository(QualityCheck) private readonly checks: Repository<QualityCheck>,
    @InjectRepository(ProductionOrder) private readonly orders: Repository<ProductionOrder>,
  ) {}

  async list(query: QualityCheckListQuery = {}): Promise<QualityCheckDto[]> {
    const where: Record<string, unknown> = {}
    if (query.manufacturingOrderId) where.manufacturingOrderId = query.manufacturingOrderId
    if (query.workOrderId) where.workOrderId = query.workOrderId
    if (query.result) where.result = query.result
    const rows = await this.checks.find({ where, order: { checkedAt: 'DESC' } })
    return this.enrich(rows)
  }

  async get(id: string): Promise<QualityCheckDto> {
    const c = await this.checks.findOne({ where: { id } })
    if (!c) throw new NotFoundException('Kalite kaydı bulunamadı')
    return (await this.enrich([c]))[0]
  }

  async record(dto: RecordQualityCheckDto): Promise<QualityCheckDto> {
    if (!(await this.orders.exists({ where: { id: dto.manufacturingOrderId } }))) {
      throw new NotFoundException('Üretim emri bulunamadı')
    }
    const check = this.checks.create({
      manufacturingOrderId: dto.manufacturingOrderId,
      workOrderId: dto.workOrderId ?? null,
      operationId: dto.operationId ?? null,
      checkType: dto.checkType ?? 'operation',
      result: dto.result,
      inspectedQuantity: dto.inspectedQuantity ?? 0,
      passedQuantity: dto.passedQuantity ?? 0,
      rejectedQuantity: dto.rejectedQuantity ?? 0,
      inspectorEmployeeId: dto.inspectorEmployeeId ?? null,
      notes: dto.notes ?? null,
      checkedAt: new Date(),
    })
    return (await this.enrich([await this.checks.save(check)]))[0]
  }

  /** True if a passing quality check exists for a work order (used by finish). */
  async hasPassingCheck(workOrderId: string, em?: EntityManager): Promise<boolean> {
    const repo = em ? em.getRepository(QualityCheck) : this.checks
    return repo.exists({ where: { workOrderId, result: 'pass' } })
  }

  private async enrich(rows: QualityCheck[]): Promise<QualityCheckDto[]> {
    if (rows.length === 0) return []
    const moIds = [...new Set(rows.map((r) => r.manufacturingOrderId))]
    const orders = await this.orders.find({ where: { id: In(moIds) }, select: { id: true, orderNo: true } })
    const moNo = new Map(orders.map((o) => [o.id, o.orderNo]))
    return rows.map((c) => ({
      id: c.id,
      manufacturingOrderId: c.manufacturingOrderId,
      manufacturingOrderNo: moNo.get(c.manufacturingOrderId) ?? '',
      workOrderId: c.workOrderId,
      operationId: c.operationId,
      checkType: c.checkType,
      result: c.result,
      inspectedQuantity: c.inspectedQuantity,
      passedQuantity: c.passedQuantity,
      rejectedQuantity: c.rejectedQuantity,
      inspectorEmployeeId: c.inspectorEmployeeId,
      notes: c.notes,
      checkedAt: c.checkedAt.toISOString(),
      createdAt: c.createdAt.toISOString(),
    }))
  }
}
