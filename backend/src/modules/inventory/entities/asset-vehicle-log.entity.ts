import { Column, Entity, Index } from 'typeorm'

import type { AssetVehicleLogKind } from '@turbohesap/shared'

import { BaseEntity } from '../../../common/entities/base.entity'
import {
  decimalTransformer,
  nullableDecimalTransformer,
} from '../../../common/decimal.transformer'

// Araç KM & Yakıt — usage ledger for vehicle assets. `yakit` = fuel purchase,
// `km` = odometer-only reading. The asset's currentOdometer is derived as the max
// odometer across these rows.
@Entity('inventory_asset_vehicle_logs')
export class AssetVehicleLog extends BaseEntity {
  @Index()
  @Column({ type: 'uuid' })
  assetId!: string

  @Column({ default: 'yakit' })
  kind!: AssetVehicleLogKind

  @Column({ type: 'date' })
  date!: string

  @Column('numeric', { precision: 18, scale: 1, default: 0, transformer: decimalTransformer })
  odometer!: number

  @Column('numeric', {
    precision: 18,
    scale: 2,
    nullable: true,
    transformer: nullableDecimalTransformer,
  })
  liters!: number | null

  @Column('numeric', {
    precision: 18,
    scale: 4,
    nullable: true,
    transformer: nullableDecimalTransformer,
  })
  unitPrice!: number | null

  @Column('numeric', {
    precision: 18,
    scale: 2,
    nullable: true,
    transformer: nullableDecimalTransformer,
  })
  totalCost!: number | null

  @Column({ default: 'TRY' })
  currency!: string

  @Column({ type: 'varchar', nullable: true })
  fuelTypeKey!: string | null

  @Column({ default: false })
  isFull!: boolean

  @Column({ type: 'varchar', nullable: true })
  station!: string | null

  @Column({ type: 'uuid', nullable: true })
  driverEmployeeId!: string | null

  @Column({ type: 'varchar', nullable: true })
  driverEmployeeName!: string | null

  @Column({ type: 'text', nullable: true })
  notes!: string | null
}
