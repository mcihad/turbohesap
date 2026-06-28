import { Column, Entity, Index } from 'typeorm'

import { BaseEntity } from '../../../common/entities/base.entity'
import { decimalTransformer } from '../../../common/decimal.transformer'

// One option within a modifier group; `priceDelta` can be negative.
@Entity('inventory_modifier_options')
export class ProductModifierOption extends BaseEntity {
  @Index()
  @Column({ type: 'uuid' })
  groupId!: string

  @Column()
  name!: string

  @Column('numeric', { precision: 18, scale: 2, default: 0, transformer: decimalTransformer })
  priceDelta!: number

  @Column({ default: false })
  isDefault!: boolean

  @Column({ type: 'int', default: 0 })
  sortOrder!: number

  @Column({ default: true })
  isActive!: boolean
}
