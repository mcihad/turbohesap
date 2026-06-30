import { Column, Entity, Index } from 'typeorm'

import type { AssetStatus } from '@turbohesap/shared'

import { BaseEntity } from '../../../common/entities/base.entity'
import {
  decimalTransformer,
  nullableDecimalTransformer,
} from '../../../common/decimal.transformer'

// Demirbaş (fixed asset) — a single tracked unit the business owns: equipment,
// machinery, vehicles, computers, furniture. Independent of product stock-on-hand.
// The current custodian is denormalized here (currentEmployee*) for a fast
// "kimde?" lookup; the full custody history lives in `inventory_asset_assignments`.
@Entity('inventory_assets')
export class Asset extends BaseEntity {
  @Index({ unique: true })
  @Column()
  code!: string

  @Column()
  name!: string

  @Column({ type: 'varchar', nullable: true })
  assetTypeKey!: string | null

  @Index()
  @Column({ type: 'varchar', nullable: true })
  barcode!: string | null

  @Column({ type: 'varchar', nullable: true })
  serialNo!: string | null

  @Column({ type: 'varchar', nullable: true })
  brand!: string | null

  @Column({ type: 'varchar', nullable: true })
  model!: string | null

  @Column({ type: 'date', nullable: true })
  purchaseDate!: string | null

  @Column('numeric', { precision: 18, scale: 2, default: 0, transformer: decimalTransformer })
  purchaseValue!: number

  @Column({ default: 'TRY' })
  currency!: string

  @Index()
  @Column({ type: 'uuid', nullable: true })
  supplierContactId!: string | null

  @Column({ type: 'date', nullable: true })
  warrantyEnd!: string | null

  @Index()
  @Column({ type: 'uuid', nullable: true })
  branchId!: string | null

  @Index()
  @Column({ default: 'depoda' })
  status!: AssetStatus

  @Column({ type: 'varchar', nullable: true })
  statusReason!: string | null

  @Column({ type: 'text', nullable: true })
  statusNote!: string | null

  @Column({ type: 'timestamptz', nullable: true })
  statusChangedAt!: Date | null

  @Index()
  @Column({ type: 'uuid', nullable: true })
  currentEmployeeId!: string | null

  @Column({ type: 'varchar', nullable: true })
  currentEmployeeName!: string | null

  @Column({ type: 'uuid', nullable: true })
  currentAssignmentId!: string | null

  @Column({ default: false })
  isVehicle!: boolean

  @Column({ type: 'varchar', nullable: true })
  plate!: string | null

  @Column({ type: 'varchar', nullable: true })
  chassisNo!: string | null

  @Column({ type: 'varchar', nullable: true })
  engineNo!: string | null

  @Column({ type: 'int', nullable: true })
  modelYear!: number | null

  @Column({ type: 'varchar', nullable: true })
  fuelTypeKey!: string | null

  @Column('numeric', {
    precision: 18,
    scale: 1,
    nullable: true,
    transformer: nullableDecimalTransformer,
  })
  currentOdometer!: number | null

  @Column({ type: 'text', nullable: true })
  notes!: string | null

  @Column({ default: true })
  isActive!: boolean
}
