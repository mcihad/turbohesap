import { Column, Entity, Index } from 'typeorm'

import type { PosSessionStatus } from '@turbohesap/shared'

import { BaseEntity } from '../../../common/entities/base.entity'
import { decimalTransformer } from '../../../common/decimal.transformer'

// A cashier shift on a register, with opening/closing cash counts.
@Entity('pos_sessions')
export class PosSession extends BaseEntity {
  @Index()
  @Column({ type: 'uuid' })
  registerId!: string

  @Index()
  @Column({ type: 'uuid' })
  branchId!: string

  @Column({ type: 'uuid' })
  openedById!: string

  @Column({ type: 'timestamptz' })
  openedAt!: Date

  @Column('numeric', { precision: 18, scale: 2, default: 0, transformer: decimalTransformer })
  openingCash!: number

  @Column({ type: 'timestamptz', nullable: true })
  closedAt!: Date | null

  @Column('numeric', { precision: 18, scale: 2, nullable: true, transformer: decimalTransformer })
  closingCash!: number | null

  @Column('numeric', { precision: 18, scale: 2, nullable: true, transformer: decimalTransformer })
  countedCash!: number | null

  @Column({ type: 'uuid', nullable: true })
  closedById!: string | null

  // Aggregated finance postings created at close (vezne). Cash/card are NOT
  // posted per-order — they post once here when the session closes.
  @Column({ type: 'uuid', nullable: true })
  cashFinanceTxId!: string | null

  @Column({ type: 'uuid', nullable: true })
  cardFinanceTxId!: string | null

  @Index()
  @Column({ default: 'open' })
  status!: PosSessionStatus

  @Column({ type: 'text', nullable: true })
  notes!: string | null
}
