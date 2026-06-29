import { Column, Entity, Index } from 'typeorm'

import { BaseEntity } from '../../../common/entities/base.entity'
import { decimalTransformer } from '../../../common/decimal.transformer'

// A product handed out together with a parent product at POS (e.g. a pizza
// comes with 2 ketchups). Auto-added as a separate order line when the parent is
// sold. Can be free or priced, optionally deduct stock, optionally returnable.
@Entity('inventory_product_bundle_components')
export class ProductBundleComponent extends BaseEntity {
  @Index()
  @Column({ type: 'uuid' })
  productId!: string

  @Column({ type: 'uuid' })
  componentProductId!: string

  @Column({ type: 'uuid', nullable: true })
  componentVariantId!: string | null

  @Column('numeric', { precision: 18, scale: 4, default: 1, transformer: decimalTransformer })
  qty!: number

  @Column({ default: true })
  isFree!: boolean

  @Column('numeric', { precision: 18, scale: 2, nullable: true, transformer: decimalTransformer })
  unitPrice!: number | null

  @Column({ default: true })
  deductStock!: boolean

  @Column({ default: true })
  returnable!: boolean

  @Column({ type: 'int', default: 0 })
  sortOrder!: number
}
