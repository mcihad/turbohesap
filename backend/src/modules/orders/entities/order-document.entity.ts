import { Column, Entity, Index } from 'typeorm'

import type {
  InvoiceVatSummaryRow,
  OrderDirection,
  OrderKind,
  OrderStatus,
} from '@turbohesap/shared'

import { BaseEntity } from '../../../common/entities/base.entity'
import { decimalTransformer } from '../../../common/decimal.transformer'

// Unified order-to-cash / procure-to-pay document: Teklif → Sipariş → İrsaliye,
// discriminated by `kind` (+ `direction`). Totals + KDV özeti are computed with
// the shared invoice helpers and persisted on save (order totals == invoice
// totals). `number` is assigned only on confirm (gapless per kind+direction+series).
@Entity('order_documents')
@Index(['kind', 'direction', 'series', 'number'], { unique: true, where: '"number" <> \'\'' })
export class OrderDocument extends BaseEntity {
  @Index()
  @Column({ default: 'quote' })
  kind!: OrderKind

  @Index()
  @Column({ default: 'sales' })
  direction!: OrderDirection

  @Index()
  @Column({ default: 'draft' })
  status!: OrderStatus

  @Column({ default: '' })
  series!: string

  @Index()
  @Column({ default: '' })
  number!: string

  @Index()
  @Column({ type: 'uuid' })
  contactId!: string

  @Index()
  @Column({ type: 'uuid', nullable: true })
  branchId!: string | null

  @Column({ type: 'date' })
  date!: string

  @Column({ type: 'date', nullable: true })
  validUntil!: string | null

  @Column({ type: 'date', nullable: true })
  dueDate!: string | null

  @Column({ default: 'TRY' })
  currencyCode!: string

  @Column('numeric', { precision: 18, scale: 6, default: 1, transformer: decimalTransformer })
  exchangeRate!: number

  @Column({ type: 'text', nullable: true })
  notes!: string | null

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

  // Chain links: the document converted FROM / TO, and the produced Fatura.
  @Column({ type: 'uuid', nullable: true })
  sourceDocId!: string | null

  @Column({ type: 'uuid', nullable: true })
  targetDocId!: string | null

  @Column({ type: 'uuid', nullable: true })
  invoiceId!: string | null
}
