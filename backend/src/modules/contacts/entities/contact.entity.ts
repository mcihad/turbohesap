import { Column, Entity, Index } from 'typeorm'

import type { BalanceSide, ContactRole, ContactType } from '@turbohesap/shared'

import { BaseEntity } from '../../../common/entities/base.entity'
import { decimalTransformer } from '../../../common/decimal.transformer'

// Cari (contact) — the unified party (customer/supplier/both/lead). Balance is
// NOT stored here; it is computed from the contact_transactions ledger.
@Entity('contacts')
export class Contact extends BaseEntity {
  @Index({ unique: true })
  @Column()
  code!: string

  @Column({ default: 'company' })
  contactType!: ContactType

  @Index()
  @Column({ default: 'customer' })
  role!: ContactRole

  @Index()
  @Column()
  name!: string

  @Column({ type: 'varchar', nullable: true })
  taxOffice!: string | null

  @Column({ type: 'varchar', nullable: true })
  taxNumber!: string | null

  @Column({ type: 'varchar', nullable: true })
  nationalId!: string | null

  @Column({ type: 'varchar', nullable: true })
  email!: string | null

  @Column({ type: 'varchar', nullable: true })
  phone!: string | null

  @Column({ type: 'varchar', nullable: true })
  mobile!: string | null

  @Column({ type: 'varchar', nullable: true })
  website!: string | null

  @Column({ default: 'TRY' })
  currencyCode!: string

  @Column('numeric', { precision: 18, scale: 2, default: 0, transformer: decimalTransformer })
  openingBalance!: number

  @Column({ default: 'debit' })
  openingBalanceSide!: BalanceSide

  @Column('numeric', { precision: 18, scale: 2, default: 0, transformer: decimalTransformer })
  creditLimit!: number

  @Column({ type: 'int', default: 0 })
  paymentTermDays!: number

  @Index()
  @Column({ type: 'uuid', nullable: true })
  groupId!: string | null

  // Sorumlu kullanıcı (sales owner).
  @Index()
  @Column({ type: 'uuid', nullable: true })
  ownerId!: string | null

  // Lead (aday) alanları.
  @Column({ type: 'varchar', nullable: true })
  leadSource!: string | null

  @Column({ type: 'varchar', nullable: true })
  leadStatus!: string | null

  @Column({ type: 'jsonb', default: () => "'[]'" })
  tags!: string[]

  @Column({ type: 'varchar', nullable: true })
  iban!: string | null

  @Column({ type: 'varchar', nullable: true })
  bankName!: string | null

  @Index()
  @Column({ type: 'uuid', nullable: true })
  branchId!: string | null

  @Column({ type: 'text', nullable: true })
  notes!: string | null

  // Custom field values (keyed by CRM field def key).
  @Column({ type: 'jsonb', default: () => "'{}'" })
  attributes!: Record<string, unknown>

  @Column({ default: true })
  isActive!: boolean
}
