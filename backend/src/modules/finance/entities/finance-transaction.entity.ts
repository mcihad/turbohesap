import { Column, Entity, Index } from 'typeorm'
import { BaseEntity } from '../../../common/entities/base.entity'
import type { FinanceTransactionType } from '@turbohesap/shared'

@Entity('finance_transactions')
export class FinanceTransaction extends BaseEntity {
  @Index()
  @Column({ type: 'uuid', nullable: true })
  cashAccountId!: string | null

  @Index()
  @Column({ type: 'uuid', nullable: true })
  bankAccountId!: string | null

  @Index()
  @Column({ type: 'uuid', nullable: true })
  contactId!: string | null

  @Column()
  type!: FinanceTransactionType

  @Column('numeric', {
    precision: 18,
    scale: 2,
    transformer: {
      to: (v: number) => v,
      from: (v: string | null) => (v == null ? 0 : Number(v)),
    },
  })
  amount!: number

  @Column({ type: 'timestamptz' })
  date!: Date

  @Column({ default: '' })
  description!: string

  // Source document that produced this transaction (e.g. a POS session close,
  // 'pos-session' + sessionId), for drill-down and reversal. Optional.
  @Index()
  @Column({ type: 'varchar', nullable: true })
  sourceModule!: string | null

  @Column({ type: 'uuid', nullable: true })
  sourceId!: string | null
}
