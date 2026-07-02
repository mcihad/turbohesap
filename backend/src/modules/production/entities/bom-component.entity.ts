import { Column, Entity, Index } from 'typeorm'

import type { ComponentConsumptionType } from '@turbohesap/shared'

import { BaseEntity } from '../../../common/entities/base.entity'
import { decimalTransformer } from '../../../common/decimal.transformer'

// Reçete bileşeni (BOM component) — hammadde/yarı mamul satırı.
@Entity('production_bom_components')
export class BomComponent extends BaseEntity {
  @Index()
  @Column({ type: 'uuid' })
  bomId!: string

  @Column({ type: 'uuid' })
  componentProductId!: string

  @Column({ type: 'uuid', nullable: true })
  componentVariantId!: string | null

  @Column('numeric', { precision: 18, scale: 4, default: 0, transformer: decimalTransformer })
  quantity!: number

  @Column({ default: 'ADET' })
  unit!: string

  @Column('numeric', { precision: 7, scale: 4, default: 0, transformer: decimalTransformer })
  scrapRate!: number

  @Column({ type: 'uuid', nullable: true })
  operationId!: string | null

  @Column({ default: 'auto' })
  consumptionType!: ComponentConsumptionType

  @Column({ default: false })
  isOptional!: boolean

  @Column({ type: 'uuid', nullable: true })
  applyOnVariantId!: string | null

  @Column({ type: 'text', nullable: true })
  notes!: string | null

  @Column({ type: 'int', default: 0 })
  sortOrder!: number
}
