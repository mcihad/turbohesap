import { Column, Entity, Index } from 'typeorm'

import type { ReservationStatus } from '@turbohesap/shared'

import { BaseEntity } from '../../../common/entities/base.entity'
import { decimalTransformer } from '../../../common/decimal.transformer'

// Stok rezervasyonu — onaylı üretim emri / satış için ayrılan miktar. Ledger
// hareketi DEĞİL (on-hand değişmez); ProductStock.reservedQty'yi günceller.
// available = quantity - reservedQty. Kaynak etiketiyle (sourceModule/sourceId)
// toplu serbest bırakılır.
@Entity('inventory_stock_reservations')
export class StockReservation extends BaseEntity {
  @Index()
  @Column({ type: 'uuid' })
  productId!: string

  @Column({ type: 'uuid', nullable: true })
  variantId!: string | null

  @Column({ type: 'uuid', nullable: true })
  branchId!: string | null

  @Column('numeric', { precision: 18, scale: 4, default: 0, transformer: decimalTransformer })
  quantity!: number

  @Index()
  @Column({ default: 'active' })
  status!: ReservationStatus

  @Index()
  @Column({ type: 'varchar' })
  sourceModule!: string

  @Column({ type: 'uuid' })
  sourceId!: string

  @Column({ type: 'timestamptz', nullable: true })
  expiresAt!: Date | null
}
