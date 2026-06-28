import { Column, Entity } from 'typeorm'

import type { ModifierSelectionType } from '@turbohesap/shared'

import { BaseEntity } from '../../../common/entities/base.entity'

// Reusable POS modifier group (e.g. "Ekstra Soslar") attachable to many products.
@Entity('inventory_modifier_groups')
export class ProductModifierGroup extends BaseEntity {
  @Column()
  name!: string

  @Column({ default: 'single' })
  selectionType!: ModifierSelectionType

  @Column({ default: false })
  required!: boolean

  @Column({ type: 'int', default: 0 })
  minSelect!: number

  @Column({ type: 'int', nullable: true })
  maxSelect!: number | null

  @Column({ type: 'int', default: 0 })
  sortOrder!: number

  @Column({ default: true })
  isActive!: boolean
}
