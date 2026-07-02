import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { In, IsNull, Repository } from 'typeorm'

import type { AvailabilityDto, AvailabilityQuery } from '@turbohesap/shared'

import { ProductStock } from './entities/product-stock.entity'
import { ProductionOrder } from '../production/entities/production-order.entity'
import { OrderDocument } from '../orders/entities/order-document.entity'
import { OrderDocumentLine } from '../orders/entities/order-document-line.entity'

// Uygunluk / ATP (Available-To-Promise). E-ticaret, satış (orders) ve üretim
// MTO bu kontratı tüketir.
//   available = onHand − reserved
//   incoming  = ufuk içindeki planlı girişler (şimdilik açık üretim emirleri;
//               açık satınalma Dalga 4'te eklenecek)
//   atp       = available + incoming
@Injectable()
export class AvailabilityService {
  constructor(
    @InjectRepository(ProductStock) private readonly stocks: Repository<ProductStock>,
    @InjectRepository(ProductionOrder) private readonly orders: Repository<ProductionOrder>,
    @InjectRepository(OrderDocument) private readonly orderDocs: Repository<OrderDocument>,
    @InjectRepository(OrderDocumentLine) private readonly orderLines: Repository<OrderDocumentLine>,
  ) {}

  async get(query: AvailabilityQuery): Promise<AvailabilityDto> {
    const { productId } = query
    const variantId = query.variantId ?? undefined
    const branchId = query.branchId ?? undefined

    const stockWhere: Record<string, unknown> = { productId }
    if (variantId !== undefined) stockWhere.variantId = variantId ?? IsNull()
    if (branchId !== undefined) stockWhere.branchId = branchId ?? IsNull()
    const stockRows = await this.stocks.find({ where: stockWhere })
    const onHand = stockRows.reduce((s, r) => s + (r.quantity ?? 0), 0)
    const reserved = stockRows.reduce((s, r) => s + (r.reservedQty ?? 0), 0)
    const available = onHand - reserved

    const incoming =
      (await this.incomingFromProduction(productId, variantId, branchId)) +
      (await this.incomingFromPurchase(productId, variantId, branchId))

    return {
      productId,
      variantId: query.variantId ?? null,
      branchId: query.branchId ?? null,
      onHand,
      reserved,
      available,
      incoming,
      atp: available + incoming,
    }
  }

  async bulk(
    units: Array<{ productId: string; variantId?: string }>,
    opts?: { branchId?: string; horizonDays?: number },
  ): Promise<AvailabilityDto[]> {
    return Promise.all(
      units.map((u) =>
        this.get({ productId: u.productId, variantId: u.variantId ?? null, branchId: opts?.branchId ?? null, horizonDays: opts?.horizonDays }),
      ),
    )
  }

  // Remaining output of open (confirmed/in_progress) manufacturing orders.
  private async incomingFromProduction(
    productId: string,
    variantId: string | null | undefined,
    branchId: string | null | undefined,
  ): Promise<number> {
    const qb = this.orders
      .createQueryBuilder('o')
      .where('o.productId = :productId', { productId })
      .andWhere("o.status IN ('confirmed','in_progress')")
    if (variantId !== undefined) {
      if (variantId === null) qb.andWhere('o.variantId IS NULL')
      else qb.andWhere('o.variantId = :variantId', { variantId })
    }
    if (branchId !== undefined) {
      if (branchId === null) qb.andWhere('o.targetBranchId IS NULL')
      else qb.andWhere('o.targetBranchId = :branchId', { branchId })
    }
    const rows = await qb.getMany()
    return rows.reduce((sum, o) => sum + Math.max(0, (o.plannedQuantity ?? 0) - (o.producedQuantity ?? 0)), 0)
  }

  // Open purchase orders (direction=purchase, kind=order, status=confirmed) =
  // scheduled receipts. Approximate: full line quantity (partial receipt netting
  // via İrsaliye is a future refinement).
  private async incomingFromPurchase(
    productId: string,
    variantId: string | null | undefined,
    branchId: string | null | undefined,
  ): Promise<number> {
    const docs = await this.orderDocs.find({ where: { direction: 'purchase', kind: 'order', status: 'confirmed' } })
    if (docs.length === 0) return 0
    const relevant = branchId === undefined ? docs : docs.filter((d) => (branchId === null ? d.branchId === null : d.branchId === branchId))
    if (relevant.length === 0) return 0
    const lines = await this.orderLines.find({ where: { documentId: In(relevant.map((d) => d.id)), productId } })
    return lines
      .filter((l) => (variantId === undefined ? true : (variantId === null ? l.variantId === null : l.variantId === variantId)))
      .reduce((sum, l) => sum + (l.quantity ?? 0), 0)
  }
}
