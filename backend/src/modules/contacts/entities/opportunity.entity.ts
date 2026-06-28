import { Column, Entity, Index } from 'typeorm'

import type { OpportunityStage } from '@turbohesap/shared'

import { BaseEntity } from '../../../common/entities/base.entity'
import { decimalTransformer } from '../../../common/decimal.transformer'

// Satış Fırsatı — a deal on a contact. isClosed/isWon are derived from `stage`.
@Entity('contact_opportunities')
export class Opportunity extends BaseEntity {
  @Index()
  @Column({ type: 'uuid' })
  contactId!: string

  @Column({ type: 'uuid', nullable: true })
  contactPersonId!: string | null

  @Column()
  name!: string

  // Legacy stage slug, kept as a denormalized mirror of the stage's `key` for
  // backward-compatible filters/counts. Source of truth is `stageId`.
  @Index()
  @Column({ default: 'prospecting' })
  stage!: OpportunityStage

  @Index()
  @Column({ type: 'uuid', nullable: true })
  pipelineId!: string | null

  @Index()
  @Column({ type: 'uuid', nullable: true })
  stageId!: string | null

  // When the deal entered its current stage (for days-in-stage / rotting).
  @Column({ type: 'timestamptz', nullable: true })
  stageEnteredAt!: Date | null

  @Column({ type: 'varchar', nullable: true })
  winReason!: string | null

  @Column({ type: 'varchar', nullable: true })
  lossReason!: string | null

  @Column('numeric', { precision: 18, scale: 2, default: 0, transformer: decimalTransformer })
  amount!: number

  @Column({ default: 'TRY' })
  currencyCode!: string

  @Column('numeric', { precision: 5, scale: 2, default: 0, transformer: decimalTransformer })
  probability!: number

  @Column({ type: 'date', nullable: true })
  expectedCloseDate!: string | null

  @Column({ type: 'varchar', nullable: true })
  source!: string | null

  @Column({ type: 'uuid', nullable: true })
  ownerId!: string | null

  @Column({ type: 'text', nullable: true })
  notes!: string | null

  // Custom field values (keyed by CRM field def key).
  @Column({ type: 'jsonb', default: () => "'{}'" })
  attributes!: Record<string, unknown>
}
