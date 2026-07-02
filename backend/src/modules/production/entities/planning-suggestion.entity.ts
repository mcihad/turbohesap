import { Column, Entity, Index } from 'typeorm'

import type {
  PlanningSuggestionReason,
  PlanningSuggestionStatus,
  PlanningSuggestionType,
} from '@turbohesap/shared'

import { BaseEntity } from '../../../common/entities/base.entity'
import { decimalTransformer } from '../../../common/decimal.transformer'

// Planlama önerisi — netleştirme sonrası bir ürün için üretim/satınalma önerisi.
@Entity('production_planning_suggestions')
export class PlanningSuggestion extends BaseEntity {
  @Index()
  @Column({ type: 'uuid' })
  runId!: string

  @Column({ type: 'uuid' })
  productId!: string

  @Column({ type: 'uuid', nullable: true })
  variantId!: string | null

  @Column({ type: 'uuid', nullable: true })
  branchId!: string | null

  @Column({ default: 'manufacture' })
  suggestionType!: PlanningSuggestionType

  @Column({ default: 'reorder' })
  reason!: PlanningSuggestionReason

  @Column('numeric', { precision: 18, scale: 4, default: 0, transformer: decimalTransformer })
  requiredQuantity!: number

  @Column({ default: 'ADET' })
  unit!: string

  @Column({ type: 'date', nullable: true })
  suggestedDate!: string | null

  @Column({ type: 'int', default: 0 })
  level!: number

  @Column({ type: 'varchar', nullable: true })
  sourceRef!: string | null

  @Index()
  @Column({ default: 'pending' })
  status!: PlanningSuggestionStatus

  @Column({ type: 'uuid', nullable: true })
  createdManufacturingOrderId!: string | null
}
