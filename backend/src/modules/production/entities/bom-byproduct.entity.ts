import { Column, Entity, Index } from 'typeorm'

import { BaseEntity } from '../../../common/entities/base.entity'
import { decimalTransformer } from '../../../common/decimal.transformer'

// Reçete yan ürünü (BOM by-product / co-product) — üretimde çıkan ikincil ürün.
@Entity('production_bom_byproducts')
export class BomByproduct extends BaseEntity {
  @Index()
  @Column({ type: 'uuid' })
  bomId!: string

  @Column({ type: 'uuid' })
  productId!: string

  @Column({ type: 'uuid', nullable: true })
  variantId!: string | null

  @Column('numeric', { precision: 18, scale: 4, default: 0, transformer: decimalTransformer })
  quantity!: number

  @Column({ default: 'ADET' })
  unit!: string

  @Column('numeric', { precision: 7, scale: 4, default: 0, transformer: decimalTransformer })
  costShareRate!: number

  @Column({ type: 'int', default: 0 })
  sortOrder!: number
}
