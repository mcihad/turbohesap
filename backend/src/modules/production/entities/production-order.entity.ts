import { Column, Entity, Index } from 'typeorm'

import type {
  ConsumptionMode,
  ProductionOrderStatus,
  ProductionOrderType,
  ProductionPriority,
  ProductionSourceMode,
} from '@turbohesap/shared'

import { BaseEntity } from '../../../common/entities/base.entity'
import {
  decimalTransformer,
  nullableDecimalTransformer,
} from '../../../common/decimal.transformer'

// Üretim Emri (Manufacturing Order) — header. Bileşen/yan ürün snapshot'ları ve
// İş Emirleri ayrı tablolarda (orderId). Stok etkileri InventoryModule
// (StockMovementsService) üzerinden, sourceModule:'production', sourceId:<bu id>.
@Entity('production_orders')
export class ProductionOrder extends BaseEntity {
  @Index({ unique: true })
  @Column()
  orderNo!: string

  @Index()
  @Column({ type: 'uuid' })
  productId!: string

  @Column({ type: 'uuid', nullable: true })
  variantId!: string | null

  // BOM snapshot (the active BOM at confirm time; version frozen for traceability).
  @Column({ type: 'uuid', nullable: true })
  bomId!: string | null

  @Column({ type: 'varchar', nullable: true })
  bomCode!: string | null

  @Column({ type: 'int', nullable: true })
  bomVersion!: number | null

  @Column({ default: 'standard' })
  type!: ProductionOrderType

  @Column({ default: 'mts' })
  sourceMode!: ProductionSourceMode

  @Column({ type: 'uuid', nullable: true })
  salesOrderLineId!: string | null

  @Column('numeric', { precision: 18, scale: 4, default: 0, transformer: decimalTransformer })
  plannedQuantity!: number

  @Column('numeric', { precision: 18, scale: 4, default: 0, transformer: decimalTransformer })
  producedQuantity!: number

  @Column('numeric', { precision: 18, scale: 4, default: 0, transformer: decimalTransformer })
  scrappedQuantity!: number

  @Column({ default: 'ADET' })
  unit!: string

  @Index()
  @Column({ default: 'draft' })
  status!: ProductionOrderStatus

  @Column({ default: 'normal' })
  priority!: ProductionPriority

  @Column({ type: 'uuid', nullable: true })
  componentSourceBranchId!: string | null

  @Column({ type: 'uuid', nullable: true })
  targetBranchId!: string | null

  @Column({ type: 'uuid', nullable: true })
  wipBranchId!: string | null

  @Column({ type: 'uuid', nullable: true })
  subcontractorContactId!: string | null

  @Column({ default: 'backflush' })
  consumptionMode!: ConsumptionMode

  @Column({ type: 'date', nullable: true })
  plannedStartDate!: string | null

  @Column({ type: 'date', nullable: true })
  plannedEndDate!: string | null

  @Column({ type: 'timestamptz', nullable: true })
  actualStartDate!: Date | null

  @Column({ type: 'timestamptz', nullable: true })
  actualEndDate!: Date | null

  @Column({ type: 'date', nullable: true })
  dueDate!: string | null

  @Column({ type: 'uuid', nullable: true })
  responsibleEmployeeId!: string | null

  // ── Cost snapshot ──────────────────────────────────────────────────────────
  @Column('numeric', { precision: 18, scale: 4, default: 0, transformer: decimalTransformer })
  stdMaterialCost!: number

  @Column('numeric', { precision: 18, scale: 4, default: 0, transformer: decimalTransformer })
  stdOperationCost!: number

  @Column('numeric', { precision: 18, scale: 4, default: 0, transformer: decimalTransformer })
  stdOverheadCost!: number

  @Column('numeric', { precision: 18, scale: 4, default: 0, transformer: decimalTransformer })
  actualMaterialCost!: number

  @Column('numeric', { precision: 18, scale: 4, default: 0, transformer: decimalTransformer })
  actualOperationCost!: number

  @Column('numeric', { precision: 18, scale: 4, default: 0, transformer: decimalTransformer })
  actualOverheadCost!: number

  // Fason işçilik ücreti (subcontract MO) — operasyon maliyetine eklenir.
  @Column('numeric', { precision: 18, scale: 4, default: 0, transformer: decimalTransformer })
  subcontractServiceCost!: number

  @Column('numeric', { precision: 18, scale: 4, default: 0, transformer: decimalTransformer })
  byproductCredit!: number

  @Column('numeric', { precision: 18, scale: 4, default: 0, transformer: decimalTransformer })
  totalCost!: number

  @Column('numeric', { precision: 18, scale: 4, default: 0, transformer: decimalTransformer })
  unitCost!: number

  @Column({ default: 'TRY' })
  currency!: string

  @Column({ type: 'text', nullable: true })
  notes!: string | null
}
