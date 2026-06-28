import { Column, Entity, Index } from 'typeorm'

import { BaseEntity } from '../../../common/entities/base.entity'
import { decimalTransformer } from '../../../common/decimal.transformer'

// Fatura kalemi. Per-line computed values are persisted (shared invoice.helpers).
@Entity('invoice_lines')
export class InvoiceLine extends BaseEntity {
  @Index()
  @Column({ type: 'uuid' })
  invoiceId!: string

  @Column({ type: 'uuid', nullable: true })
  productId!: string | null

  @Column({ default: '' })
  description!: string

  @Column('numeric', { precision: 18, scale: 4, default: 0, transformer: decimalTransformer })
  quantity!: number

  @Column({ default: 'Adet' })
  unit!: string

  @Column('numeric', { precision: 18, scale: 4, default: 0, transformer: decimalTransformer })
  unitPrice!: number

  @Column('numeric', { precision: 7, scale: 4, default: 0, transformer: decimalTransformer })
  discountRate!: number

  @Column({ type: 'int', default: 0 })
  vatRate!: number

  @Column({ type: 'varchar', nullable: true })
  withholdingCode!: string | null

  @Column('numeric', { precision: 18, scale: 2, default: 0, transformer: decimalTransformer })
  lineNet!: number

  @Column('numeric', { precision: 18, scale: 2, default: 0, transformer: decimalTransformer })
  lineVat!: number

  @Column('numeric', { precision: 18, scale: 2, default: 0, transformer: decimalTransformer })
  lineWithholding!: number

  @Column('numeric', { precision: 18, scale: 2, default: 0, transformer: decimalTransformer })
  lineTotal!: number

  @Column({ type: 'int', default: 0 })
  sortOrder!: number
}
