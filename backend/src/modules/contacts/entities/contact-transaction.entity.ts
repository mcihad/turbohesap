import { Column, Entity, Index } from 'typeorm'

import type { ContactDocumentType } from '@turbohesap/shared'

import { BaseEntity } from '../../../common/entities/base.entity'
import { decimalTransformer } from '../../../common/decimal.transformer'

// Cari Hareket — debit/credit ledger entry. Balance = Σ debit − Σ credit.
@Entity('contact_transactions')
export class ContactTransaction extends BaseEntity {
  @Index()
  @Column({ type: 'uuid' })
  contactId!: string

  @Column({ type: 'date' })
  date!: string

  @Column({ default: 'invoice' })
  documentType!: ContactDocumentType

  @Column({ type: 'varchar', nullable: true })
  documentNo!: string | null

  @Column({ type: 'text', nullable: true })
  description!: string | null

  @Column('numeric', { precision: 18, scale: 2, default: 0, transformer: decimalTransformer })
  debit!: number

  @Column('numeric', { precision: 18, scale: 2, default: 0, transformer: decimalTransformer })
  credit!: number

  @Column({ default: 'TRY' })
  currencyCode!: string

  @Column('numeric', { precision: 18, scale: 6, default: 1, transformer: decimalTransformer })
  exchangeRate!: number

  @Column({ type: 'date', nullable: true })
  dueDate!: string | null

  @Column({ type: 'varchar', nullable: true })
  sourceModule!: string | null

  @Column({ type: 'uuid', nullable: true })
  sourceId!: string | null
}
