import { Column, Entity, Index } from 'typeorm'

import { BaseEntity } from '../../../common/entities/base.entity'

// İlgili Kişi — a person at a contact (company). Shared-style sub-entity.
@Entity('contact_persons')
export class ContactPerson extends BaseEntity {
  @Index()
  @Column({ type: 'uuid' })
  contactId!: string

  @Column()
  firstName!: string

  @Column({ default: '' })
  lastName!: string

  @Column({ type: 'varchar', nullable: true })
  title!: string | null

  @Column({ type: 'varchar', nullable: true })
  department!: string | null

  @Column({ type: 'varchar', nullable: true })
  email!: string | null

  @Column({ type: 'varchar', nullable: true })
  phone!: string | null

  @Column({ type: 'varchar', nullable: true })
  mobile!: string | null

  @Column({ default: false })
  isPrimary!: boolean

  @Column({ type: 'text', nullable: true })
  notes!: string | null
}
