import { Column, Entity, Index } from 'typeorm'

import type { LotRole } from '@turbohesap/shared'

import { BaseEntity } from '../../../common/entities/base.entity'
import { decimalTransformer } from '../../../common/decimal.transformer'

// Üretim Emri ↔ Lot bağı — role: consumed (tüketilen hammadde partisi) /
// produced (üretilen mamul partisi). Şecere sorgusu bu tablodan yürür.
@Entity('production_order_lots')
export class ManufacturingOrderLot extends BaseEntity {
  @Index()
  @Column({ type: 'uuid' })
  manufacturingOrderId!: string

  @Index()
  @Column({ type: 'uuid' })
  lotId!: string

  @Column()
  role!: LotRole

  @Column({ type: 'uuid' })
  productId!: string

  @Column('numeric', { precision: 18, scale: 4, default: 0, transformer: decimalTransformer })
  quantity!: number
}
