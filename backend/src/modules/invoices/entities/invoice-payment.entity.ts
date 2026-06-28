import { Column, Entity, Index } from 'typeorm'

import type { PaymentMethod } from '@turbohesap/shared'

import { BaseEntity } from '../../../common/entities/base.entity'
import { decimalTransformer } from '../../../common/decimal.transformer'

// Fatura tahsilat/ödeme kaydı — the "evrak" linking an invoice to a kasa/banka
// movement (FinanceTransaction) and a cari ledger entry (ContactTransaction).
// Those linked rows reference this payment via sourceModule='invoice-payment'.
@Entity('invoice_payments')
export class InvoicePayment extends BaseEntity {
  @Index()
  @Column({ type: 'uuid' })
  invoiceId!: string

  @Index()
  @Column({ type: 'uuid' })
  contactId!: string

  @Column({ type: 'date' })
  date!: string

  @Column('numeric', { precision: 18, scale: 2, default: 0, transformer: decimalTransformer })
  amount!: number

  @Column({ default: 'cash' })
  method!: PaymentMethod

  @Column({ type: 'uuid', nullable: true })
  cashAccountId!: string | null

  @Column({ type: 'uuid', nullable: true })
  bankAccountId!: string | null

  @Column({ type: 'text', nullable: true })
  description!: string | null

  // Linked postings, so the payment can be cleanly reversed.
  @Column({ type: 'uuid', nullable: true })
  financeTransactionId!: string | null

  @Column({ type: 'uuid', nullable: true })
  contactTransactionId!: string | null
}

