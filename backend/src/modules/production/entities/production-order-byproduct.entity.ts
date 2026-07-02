import { Column, Entity, Index } from 'typeorm'

import { BaseEntity } from '../../../common/entities/base.entity'
import {
  decimalTransformer,
  nullableDecimalTransformer,
} from '../../../common/decimal.transformer'

// Üretim Emri yan ürünü — onayda snapshot'lanır; tamamlamada gerçek miktarla
// stoğa giriş yapılır (maliyet payı costShareRate ile mamulden düşülür).
@Entity('production_order_byproducts')
export class ProductionOrderByproduct extends BaseEntity {
  @Index()
  @Column({ type: 'uuid' })
  orderId!: string

  @Column({ type: 'uuid' })
  productId!: string

  @Column({ type: 'uuid', nullable: true })
  variantId!: string | null

  @Column('numeric', { precision: 18, scale: 4, default: 0, transformer: decimalTransformer })
  quantity!: number

  @Column('numeric', { precision: 18, scale: 4, default: 0, transformer: decimalTransformer })
  producedQuantity!: number

  @Column({ default: 'ADET' })
  unit!: string

  @Column('numeric', { precision: 7, scale: 4, default: 0, transformer: decimalTransformer })
  costShareRate!: number

  @Column('numeric', { precision: 18, scale: 4, nullable: true, transformer: nullableDecimalTransformer })
  unitCost!: number | null

  @Column({ type: 'int', default: 0 })
  sortOrder!: number
}
