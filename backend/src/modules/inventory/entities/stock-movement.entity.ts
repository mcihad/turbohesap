import { Column, Entity, Index } from 'typeorm'

import type { MovementDirection } from '@turbohesap/shared'

import { BaseEntity } from '../../../common/entities/base.entity'
import { decimalTransformer } from '../../../common/decimal.transformer'

// Stok hareketi — a single in/out of stock for a (product, variant?, branch),
// recorded against a movement type. Adjusts on-hand ProductStock when created.
@Entity('inventory_stock_movements')
export class StockMovement extends BaseEntity {
  @Index()
  @Column({ type: 'uuid' })
  productId!: string

  @Column({ type: 'uuid', nullable: true })
  variantId!: string | null

  @Index()
  @Column({ type: 'uuid', nullable: true })
  branchId!: string | null

  @Column({ type: 'uuid' })
  movementTypeId!: string

  @Column()
  direction!: MovementDirection

  @Column('numeric', { precision: 18, scale: 4, default: 0, transformer: decimalTransformer })
  quantity!: number

  @Column({ default: 'Adet' })
  unit!: string

  @Column({ type: 'date' })
  date!: string

  @Column({ type: 'text', nullable: true })
  description!: string | null

  @Index()
  @Column({ type: 'varchar', nullable: true })
  sourceModule!: string | null

  @Column({ type: 'uuid', nullable: true })
  sourceId!: string | null
}
