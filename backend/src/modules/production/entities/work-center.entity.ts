import { Column, Entity, Index } from 'typeorm'

import { BaseEntity } from '../../../common/entities/base.entity'
import {
  decimalTransformer,
  nullableDecimalTransformer,
} from '../../../common/decimal.transformer'

// İş Merkezi (Work Center) — operasyonların yürütüldüğü makine+işçilik istasyonu.
@Entity('production_work_centers')
export class WorkCenter extends BaseEntity {
  @Index({ unique: true })
  @Column()
  code!: string

  @Column()
  name!: string

  @Index()
  @Column({ type: 'uuid', nullable: true })
  branchId!: string | null

  @Column('numeric', { precision: 18, scale: 2, default: 0, transformer: decimalTransformer })
  costPerHour!: number

  @Column('numeric', { precision: 18, scale: 2, nullable: true, transformer: nullableDecimalTransformer })
  setupCostPerHour!: number | null

  @Column({ default: 'TRY' })
  currency!: string

  @Column('numeric', { precision: 18, scale: 4, nullable: true, transformer: nullableDecimalTransformer })
  capacityPerHour!: number | null

  @Column({ type: 'int', default: 1 })
  parallelCapacity!: number

  @Column('numeric', { precision: 7, scale: 4, default: 1, transformer: decimalTransformer })
  efficiencyRate!: number

  @Column('numeric', { precision: 9, scale: 2, default: 0, transformer: decimalTransformer })
  setupTimeMinutes!: number

  @Column('numeric', { precision: 9, scale: 2, default: 0, transformer: decimalTransformer })
  cleanupTimeMinutes!: number

  @Column({ type: 'uuid', nullable: true })
  alternateWorkCenterId!: string | null

  @Column({ type: 'varchar', nullable: true })
  costAccountCode!: string | null

  @Column({ default: true })
  isActive!: boolean

  @Column({ type: 'text', nullable: true })
  notes!: string | null
}
