import { Column, Entity, Index } from 'typeorm'

import type { AddressType } from '@turbohesap/shared'

import { BaseEntity } from '../../../common/entities/base.entity'

// Adres — a typed address on a contact (billing/shipping/office/other).
@Entity('contact_addresses')
export class ContactAddress extends BaseEntity {
  @Index()
  @Column({ type: 'uuid' })
  contactId!: string

  @Column({ default: 'billing' })
  addressType!: AddressType

  @Column({ type: 'varchar', nullable: true })
  title!: string | null

  @Column()
  line1!: string

  @Column({ type: 'varchar', nullable: true })
  line2!: string | null

  @Column({ type: 'varchar', nullable: true })
  district!: string | null

  @Column({ default: '' })
  city!: string

  @Column({ type: 'varchar', nullable: true })
  postalCode!: string | null

  @Column({ default: 'Türkiye' })
  country!: string

  @Column({ type: 'varchar', nullable: true })
  phone!: string | null

  @Column({ default: false })
  isPrimaryBilling!: boolean

  @Column({ default: false })
  isPrimaryShipping!: boolean
}
