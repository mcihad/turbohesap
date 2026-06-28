import { Column, Entity, Index } from 'typeorm'

import { BaseEntity } from '../../../common/entities/base.entity'

// M:N link of a modifier group to a product (one group reused on many products).
@Entity('inventory_product_modifier_links')
@Index(['productId', 'groupId'], { unique: true })
export class ProductModifierLink extends BaseEntity {
  @Index()
  @Column({ type: 'uuid' })
  productId!: string

  @Index()
  @Column({ type: 'uuid' })
  groupId!: string

  @Column({ type: 'int', default: 0 })
  sortOrder!: number
}
