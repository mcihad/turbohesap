import { Column, Entity, Index } from 'typeorm'

import { BaseEntity } from '../../../common/entities/base.entity'
import { decimalTransformer } from '../../../common/decimal.transformer'

// Ürün maliyeti (moving-average / AVCO) — (product, variant?, branch?) bazında
// ortalama birim maliyet. Her 'in' hareketinde (birim maliyetli) güncellenir;
// 'out' hareketleri mevcut ortalamadan değerlenir (ortalamayı değiştirmez).
@Entity('inventory_product_costs')
@Index(['productId', 'variantId', 'branchId'])
export class ProductCost extends BaseEntity {
  @Index()
  @Column({ type: 'uuid' })
  productId!: string

  @Column({ type: 'uuid', nullable: true })
  variantId!: string | null

  @Column({ type: 'uuid', nullable: true })
  branchId!: string | null

  @Column({ default: 'moving_avg' })
  method!: string

  @Column('numeric', { precision: 18, scale: 4, default: 0, transformer: decimalTransformer })
  avgCost!: number

  @Column({ default: 'TRY' })
  currency!: string
}
