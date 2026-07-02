import { BadRequestException, Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { EntityManager, IsNull, Repository } from 'typeorm'

import type {
  ReservationListQuery,
  ReservationStatus,
  ReserveStockRequest,
  StockReservationDto,
} from '@turbohesap/shared'

import { StockReservation } from './entities/stock-reservation.entity'
import { ProductStock } from './entities/product-stock.entity'

// Stok rezervasyonu — onaylı üretim emri / satış için ayrılan miktar. Ledger
// hareketi DEĞİL (on-hand sabit); ProductStock.reservedQty'yi günceller.
// available = quantity - reservedQty. Kaynak (sourceModule/sourceId) etiketiyle
// toplu serbest bırakılır.
@Injectable()
export class ReservationsService {
  constructor(
    @InjectRepository(StockReservation) private readonly reservations: Repository<StockReservation>,
    @InjectRepository(ProductStock) private readonly stocks: Repository<ProductStock>,
  ) {}

  async list(query: ReservationListQuery = {}): Promise<StockReservationDto[]> {
    const where: Record<string, unknown> = {}
    if (query.sourceModule) where.sourceModule = query.sourceModule
    if (query.sourceId) where.sourceId = query.sourceId
    if (query.productId) where.productId = query.productId
    if (query.status) where.status = query.status
    const rows = await this.reservations.find({ where, order: { createdAt: 'DESC' } })
    return rows.map(toReservationDto)
  }

  async reserve(input: ReserveStockRequest): Promise<StockReservationDto> {
    if ((input.quantity ?? 0) <= 0) throw new BadRequestException('Rezerve miktarı girilmelidir')
    const saved = await this.reservations.manager.transaction((em) => this.reserveTxn(em, input))
    return toReservationDto(saved)
  }

  /** Reusable inside a transaction (e.g. production confirm). */
  async reserveTxn(em: EntityManager, input: ReserveStockRequest): Promise<StockReservation> {
    const repo = em.getRepository(StockReservation)
    const res = repo.create({
      productId: input.productId,
      variantId: input.variantId ?? null,
      branchId: input.branchId ?? null,
      quantity: input.quantity,
      status: 'active',
      sourceModule: input.sourceModule,
      sourceId: input.sourceId,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
    })
    const saved = await repo.save(res)
    await this.adjustReserved(em, saved.productId, saved.variantId, saved.branchId, saved.quantity)
    return saved
  }

  async releaseSource(sourceModule: string, sourceId: string): Promise<void> {
    await this.reservations.manager.transaction((em) => this.releaseSourceTxn(em, sourceModule, sourceId))
  }

  /**
   * Release all active reservations of a source within a transaction. `finalStatus`
   * = 'released' (default, e.g. cancel) or 'consumed' (production completed).
   */
  async releaseSourceTxn(
    em: EntityManager,
    sourceModule: string,
    sourceId: string,
    finalStatus: ReservationStatus = 'released',
  ): Promise<void> {
    const repo = em.getRepository(StockReservation)
    const rows = await repo.find({ where: { sourceModule, sourceId, status: 'active' } })
    for (const r of rows) {
      await this.adjustReserved(em, r.productId, r.variantId, r.branchId, -r.quantity)
      r.status = finalStatus
      await repo.save(r)
    }
  }

  /** Total active reserved quantity for a (product, variant?, branch?). */
  async reservedFor(
    productId: string,
    variantId?: string | null,
    branchId?: string | null,
    em?: EntityManager,
  ): Promise<number> {
    const repo = em ? em.getRepository(ProductStock) : this.stocks
    const rows = await repo.find({
      where: {
        productId,
        ...(variantId !== undefined ? { variantId: variantId ?? IsNull() } : {}),
        ...(branchId !== undefined ? { branchId: branchId ?? IsNull() } : {}),
      },
    })
    return rows.reduce((sum, r) => sum + (r.reservedQty ?? 0), 0)
  }

  private async adjustReserved(
    em: EntityManager,
    productId: string,
    variantId: string | null,
    branchId: string | null,
    delta: number,
  ): Promise<void> {
    const repo = em.getRepository(ProductStock)
    let row = await repo.findOne({
      where: { productId, variantId: variantId ?? IsNull(), branchId: branchId ?? IsNull() },
    })
    if (!row) {
      row = repo.create({ productId, variantId: variantId ?? null, branchId: branchId ?? null, quantity: 0, reservedQty: 0 })
    }
    row.reservedQty = Math.max(0, (row.reservedQty ?? 0) + delta)
    await repo.save(row)
  }
}

export function toReservationDto(r: StockReservation): StockReservationDto {
  return {
    id: r.id,
    productId: r.productId,
    variantId: r.variantId,
    branchId: r.branchId,
    quantity: r.quantity,
    status: r.status,
    sourceModule: r.sourceModule,
    sourceId: r.sourceId,
    expiresAt: r.expiresAt ? r.expiresAt.toISOString() : null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }
}
