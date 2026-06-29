import { Column, Entity, Index } from 'typeorm'

import type { StockCountKind, StockCountStatus } from '@turbohesap/shared'

import { BaseEntity } from '../../../common/entities/base.entity'

// A stock-count (Stok/Envanter Sayımı) session header. On `create` it snapshots
// the expected on-hand (ProductStock) of every in-scope unit into stock_count_lines;
// counting accumulates physical quantities; on `approve` the difference is posted
// to inventory as "Sayım Fazlası" (in) / "Sayım Eksiği" (out) movements. A `blind`
// count hides expectedQty from the counter; approval is gated to a DIFFERENT user
// than the creator (segregation of duties).
@Entity('stock_counts')
export class StockCount extends BaseEntity {
  @Index()
  @Column({ default: 'full' })
  kind!: StockCountKind

  @Index()
  @Column({ default: 'draft' })
  status!: StockCountStatus

  @Index()
  @Column({ type: 'uuid', nullable: true })
  branchId!: string | null

  @Column({ default: false })
  blind!: boolean

  @Column({ default: '' })
  name!: string

  @Column({ type: 'date', nullable: true })
  plannedDate!: string | null

  @Column({ type: 'timestamptz', nullable: true })
  startedAt!: Date | null

  @Column({ type: 'timestamptz', nullable: true })
  completedAt!: Date | null

  // Variance % above which a line is flagged for recount.
  @Column({ type: 'double precision', default: 0 })
  recountThresholdPct!: number

  @Column({ type: 'jsonb', default: () => "'[]'" })
  scopeCategoryIds!: string[]

  @Column({ type: 'jsonb', default: () => "'[]'" })
  scopeProductIds!: string[]

  // ABC class for a cycle count ('A' | 'B' | 'C'); null otherwise.
  @Column({ type: 'varchar', nullable: true })
  abcClass!: string | null

  // Behavioral flags captured at create-time (not surfaced in the DTO):
  // allow counting unlisted units (auto-add on scan); treat never-counted lines
  // as zero on approve.
  @Column({ default: false })
  allowAddUnlisted!: boolean

  @Column({ default: false })
  countUnscannedAsZero!: boolean

  @Index()
  @Column({ type: 'uuid' })
  createdById!: string

  @Column({ type: 'uuid', nullable: true })
  approvedById!: string | null

  @Column({ type: 'text', nullable: true })
  notes!: string | null
}
