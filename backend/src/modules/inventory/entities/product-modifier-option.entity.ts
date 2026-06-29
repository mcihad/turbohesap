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

  // Optional stock consumption: choosing this option deducts `consumeQty` of the
  // linked stock product (e.g. "Ekstra ketçap" → 1 × Ketçap) when settling.
  @Column({ type: 'uuid', nullable: true })
  stockProductId!: string | null

  @Column({ type: 'uuid', nullable: true })
  stockVariantId!: string | null

  @Column('numeric', { precision: 18, scale: 4, default: 1, transformer: decimalTransformer })
  consumeQty!: number

  @Column({ default: true })
  deductStock!: boolean

  @Column({ default: true })
  returnable!: boolean
}
