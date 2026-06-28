import { Column, Entity, Index } from 'typeorm'

import { BaseEntity } from '../../../common/entities/base.entity'

// Cari Grubu — an adjacency-list tree (parentId), like ERPNext's Customer Group.
@Entity('contact_groups')
export class ContactGroup extends BaseEntity {
  @Index()
  @Column({ type: 'uuid', nullable: true })
  parentId!: string | null

  @Column()
  name!: string

  @Column({ default: '' })
  code!: string

  @Column({ default: true })
  isActive!: boolean
}
