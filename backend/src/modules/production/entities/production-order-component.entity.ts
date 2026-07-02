import { Column, Entity, Index } from 'typeorm'

import type { ComponentConsumptionType } from '@turbohesap/shared'

import { BaseEntity } from '../../../common/entities/base.entity'
import {
  decimalTransformer,
  nullableDecimalTransformer,
} from '../../../common/decimal.transformer'

// Üretim Emri bileşeni — onayda reçete patlatılarak snapshot'lanan tüketim satırı.
// (phantom reçeteler bu noktada özyinelemeli patlatılır → yalnız yaprak bileşenler).
@Entity('production_order_components')
export class ProductionOrderComponent extends BaseEntity {
  @Index()
  @Column({ type: 'uuid' })
  orderId!: string

  @Column({ type: 'uuid' })
  componentProductId!: string

  @Column({ type: 'uuid', nullable: true })
  componentVariantId!: string | null

  @Column('numeric', { precision: 18, scale: 4, default: 0, transformer: decimalTransformer })
  requiredQuantity!: number

  @Column('numeric', { precision: 18, scale: 4, default: 0, transformer: decimalTransformer })
  reservedQuantity!: number

  @Column('numeric', { precision: 18, scale: 4, default: 0, transformer: decimalTransformer })
  consumedQuantity!: number

  @Column({ default: 'ADET' })
  unit!: string

  @Column('numeric', { precision: 7, scale: 4, default: 0, transformer: decimalTransformer })
  scrapRate!: number

  @Column({ type: 'uuid', nullable: true })
  operationId!: string | null

  @Column({ type: 'uuid', nullable: true })
  sourceBranchId!: string | null

  @Column({ default: 'auto' })
  consumptionType!: ComponentConsumptionType

  @Column({ default: false })
  isOptional!: boolean

  @Column('numeric', { precision: 18, scale: 4, nullable: true, transformer: nullableDecimalTransformer })
  unitCost!: number | null

  @Column('numeric', { precision: 18, scale: 4, nullable: true, transformer: nullableDecimalTransformer })
  totalCost!: number | null

  @Column({ type: 'int', default: 0 })
  sortOrder!: number
}
