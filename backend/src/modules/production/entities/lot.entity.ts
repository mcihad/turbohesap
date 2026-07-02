import { Column, Entity, Index } from 'typeorm'

import type { LotKind } from '@turbohesap/shared'

import { BaseEntity } from '../../../common/entities/base.entity'

// Parti/Seri kayıt defteri — (ürün, lotNo) benzersiz. Üretimden tüketilen ve
// üretilen lotlar buraya kaydedilir; şecere/geri çağırma sorgusunun temeli.
@Entity('production_lots')
@Index('UQ_production_lots_product_no', ['productId', 'lotNo'], { unique: true })
export class Lot extends BaseEntity {
  @Index()
  @Column({ type: 'uuid' })
  productId!: string

  @Column({ type: 'uuid', nullable: true })
  variantId!: string | null

  @Column()
  lotNo!: string

  @Column({ default: 'lot' })
  kind!: LotKind

  @Column({ type: 'text', nullable: true })
  notes!: string | null
}
