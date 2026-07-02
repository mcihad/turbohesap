import { Column, Entity, Index } from 'typeorm'

import type { OperationTimeBasis } from '@turbohesap/shared'

import { BaseEntity } from '../../../common/entities/base.entity'
import { decimalTransformer } from '../../../common/decimal.transformer'

// Reçete operasyonu (BOM operation / rota adımı) — bir iş merkezinde yapılan iş.
@Entity('production_bom_operations')
export class BomOperation extends BaseEntity {
  @Index()
  @Column({ type: 'uuid' })
  bomId!: string

  @Column({ type: 'int', default: 10 })
  sequence!: number

  @Column()
  name!: string

  @Column({ type: 'uuid' })
  workCenterId!: string

  @Column('numeric', { precision: 9, scale: 2, default: 0, transformer: decimalTransformer })
  setupTimeMinutes!: number

  @Column('numeric', { precision: 9, scale: 4, default: 0, transformer: decimalTransformer })
  timePerUnitMinutes!: number

  @Column({ default: 'per_unit' })
  timeBasis!: OperationTimeBasis

  @Column({ type: 'text', nullable: true })
  instructions!: string | null

  @Column({ default: false })
  qualityCheckRequired!: boolean

  @Column({ type: 'int', default: 0 })
  sortOrder!: number
}
