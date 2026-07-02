import { Column, Entity, Index } from 'typeorm'

import type { InstrumentDirection, InstrumentStatus, InstrumentType } from '@turbohesap/shared'

import { BaseEntity } from '../../../common/entities/base.entity'
import { decimalTransformer } from '../../../common/decimal.transformer'

// Çek/Senet — one entity discriminated by `instrumentType`/`direction` (mirrors
// `orders`' `OrderDocument` kind/direction pattern). `documentId` is a
// system-managed, optional link to a `documents.Document` row created
// automatically on create (see `financial-instruments.service.ts`) — never set
// directly by the client.
@Entity('finance_instruments')
export class FinancialInstrument extends BaseEntity {
  @Index()
  @Column()
  instrumentType!: InstrumentType

  @Index()
  @Column()
  direction!: InstrumentDirection

  @Index()
  @Column({ default: 'open' })
  status!: InstrumentStatus

  @Index()
  @Column({ type: 'uuid', nullable: true })
  branchId!: string | null

  @Index()
  @Column({ type: 'uuid' })
  contactId!: string

  @Column('numeric', { precision: 18, scale: 2, default: 0, transformer: decimalTransformer })
  amount!: number

  @Column({ default: 'TRY' })
  currencyCode!: string

  @Column({ type: 'date' })
  issueDate!: string

  @Index()
  @Column({ type: 'date' })
  dueDate!: string

  @Column({ default: '' })
  instrumentNo!: string

  // Yalnız çek.
  @Column({ type: 'varchar', nullable: true })
  bankName!: string | null

  @Column({ type: 'varchar', nullable: true })
  bankBranch!: string | null

  @Column({ type: 'varchar', nullable: true })
  accountNo!: string | null

  @Column({ type: 'varchar', nullable: true })
  drawerName!: string | null

  @Column({ type: 'text', nullable: true })
  notes!: string | null

  // Settle anında set edilir (collect/pay), reverse'de temizlenir.
  @Column({ type: 'uuid', nullable: true })
  cashAccountId!: string | null

  @Column({ type: 'uuid', nullable: true })
  bankAccountId!: string | null

  @Column({ type: 'uuid', nullable: true })
  financeTransactionId!: string | null

  @Column({ type: 'uuid', nullable: true })
  contactTransactionId!: string | null

  @Column({ type: 'uuid', nullable: true })
  documentId!: string | null

  @Column({ type: 'uuid', nullable: true })
  createdById!: string | null
}
