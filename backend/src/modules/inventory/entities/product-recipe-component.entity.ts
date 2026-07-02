import { Column, Entity, Index } from 'typeorm'

import { BaseEntity } from '../../../common/entities/base.entity'
import { decimalTransformer } from '../../../common/decimal.transformer'

// An ingredient consumed from stock when a menu item (pizza, köfte, hamburger)
// is SOLD — a silent backflush at POS settle / sales-invoice issue, valued at
// the ingredient's AVCO. Unlike a bundle component, it is NOT materialised as a
// visible/priced order line; it is always consumed (no deductStock opt-out).
@Entity('inventory_product_recipe_components')
export class ProductRecipeComponent extends BaseEntity {
  @Index()
  @Column({ type: 'uuid' })
  productId!: string

  @Column({ type: 'uuid' })
  componentProductId!: string

  @Column({ type: 'uuid', nullable: true })
  componentVariantId!: string | null

  @Column('numeric', { precision: 18, scale: 4, default: 1, transformer: decimalTransformer })
  quantity!: number

  @Column({ type: 'varchar', nullable: true })
  unit!: string | null

  @Column({ type: 'int', default: 0 })
  sortOrder!: number
}
