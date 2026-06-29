import { Column, Entity, Index } from 'typeorm'

import type {
  FaturaTipi,
  InvoiceEDocType,
  InvoiceStatus,
  InvoiceType,
  InvoiceVatSummaryRow,
  Senaryo,
} from '@turbohesap/shared'

import { BaseEntity } from '../../../common/entities/base.entity'
import { decimalTransformer } from '../../../common/decimal.transformer'

// Fatura header. Totals + KDV özeti are computed (shared invoice.helpers) and
// persisted here on save. `number` is assigned only on issue (gapless per series).
@Entity('invoices')
@Index(['series', 'number'], { unique: true, where: '"number" <> \'\'' })
export class Invoice extends BaseEntity {
  @Index()
  @Column({ default: 'sales' })
  type!: InvoiceType

  @Column({ default: '' })
  series!: string

  @Index()
  @Column({ default: '' })
  number!: string

  @Column({ type: 'varchar', nullable: true })
  ettn!: string | null

  @Column({ type: 'date' })
  date!: string

  @Column({ type: 'date', nullable: true })
  dueDate!: string | null

  @Index()
  @Column({ type: 'uuid' })
  contactId!: string

  @Index()
  @Column({ type: 'uuid', nullable: true })
  branchId!: string | null

  @Column({ default: 'TRY' })
  currencyCode!: string

  @Column('numeric', { precision: 18, scale: 6, default: 1, transformer: decimalTransformer })
  exchangeRate!: number

  @Index()
  @Column({ default: 'draft' })
  status!: InvoiceStatus

  @Column({ default: 'none' })
  eDocType!: InvoiceEDocType

  @Column({ default: 'SATIS' })
  faturaTipi!: FaturaTipi

  @Column({ default: 'TEMELFATURA' })
  senaryo!: Senaryo

  @Column({ type: 'text', nullable: true })
  notes!: string | null

  // When false, issuing this invoice does NOT post stock — the stock was already
  // moved by a prior İrsaliye (orders module), so the chain never double-counts.
  @Column({ default: true })
  postsStock!: boolean

  @Column('numeric', { precision: 18, scale: 2, default: 0, transformer: decimalTransformer })
  subtotal!: number

  @Column('numeric', { precision: 18, scale: 2, default: 0, transformer: decimalTransformer })
  discountTotal!: number

  @Column('numeric', { precision: 18, scale: 2, default: 0, transformer: decimalTransformer })
  vatBase!: number

  @Column('numeric', { precision: 18, scale: 2, default: 0, transformer: decimalTransformer })
  vatTotal!: number

  @Column('numeric', { precision: 18, scale: 2, default: 0, transformer: decimalTransformer })
  withholdingTotal!: number

  @Column('numeric', { precision: 18, scale: 2, default: 0, transformer: decimalTransformer })
  grandTotal!: number

  @Column({ type: 'jsonb', default: () => "'[]'" })
  vatSummary!: InvoiceVatSummaryRow[]
}
