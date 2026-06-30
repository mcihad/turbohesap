import { Column, Entity, Index } from 'typeorm'

import type {
  AssetMaintenanceStatus,
  AssetMaintenanceType,
} from '@turbohesap/shared'

import { BaseEntity } from '../../../common/entities/base.entity'
import {
  decimalTransformer,
  nullableDecimalTransformer,
} from '../../../common/decimal.transformer'

// Bakım/Onarım — maintenance & repair record for a demirbaş (incl. vehicles).
@Entity('inventory_asset_maintenance')
export class AssetMaintenance extends BaseEntity {
  @Index()
  @Column({ type: 'uuid' })
  assetId!: string

  @Column({ default: 'bakim' })
  type!: AssetMaintenanceType

  @Column({ default: 'tamamlandi' })
  status!: AssetMaintenanceStatus

  @Column({ type: 'date' })
  date!: string

  @Column('numeric', { precision: 18, scale: 2, default: 0, transformer: decimalTransformer })
  cost!: number

  @Column({ default: 'TRY' })
  currency!: string

  @Column({ type: 'uuid', nullable: true })
  vendorContactId!: string | null

  @Column('numeric', {
    precision: 18,
    scale: 1,
    nullable: true,
    transformer: nullableDecimalTransformer,
  })
  odometer!: number | null

  @Column({ type: 'text', nullable: true })
  description!: string | null

  @Column({ type: 'date', nullable: true })
  nextDueDate!: string | null

  @Column('numeric', {
    precision: 18,
    scale: 1,
    nullable: true,
    transformer: nullableDecimalTransformer,
  })
  nextDueOdometer!: number | null

  @Column({ type: 'text', nullable: true })
  notes!: string | null
}
