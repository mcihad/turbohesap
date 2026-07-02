import { Column, Entity, Index } from 'typeorm'

import { BaseEntity } from '../../../common/entities/base.entity'
import { decimalTransformer } from '../../../common/decimal.transformer'

// Min/Max reorder kuralı — bir ürün (varyant?, şube?) için yeniden sipariş noktası.
// available < minQty olduğunda maxQty seviyesine tamamlayacak öneri üretilir.
@Entity('production_reorder_rules')
@Index(['productId', 'variantId', 'branchId'])
export class ReorderRule extends BaseEntity {
  @Index()
  @Column({ type: 'uuid' })
  productId!: string

  @Column({ type: 'uuid', nullable: true })
  variantId!: string | null

  @Column({ type: 'uuid', nullable: true })
  branchId!: string | null

  @Column('numeric', { precision: 18, scale: 4, default: 0, transformer: decimalTransformer })
  minQty!: number

  @Column('numeric', { precision: 18, scale: 4, default: 0, transformer: decimalTransformer })
  maxQty!: number

  @Column({ default: true })
  isActive!: boolean
}
