import { Column, Entity } from 'typeorm'

import type { MovementDirection } from '@turbohesap/shared'

import { BaseEntity } from '../../../common/entities/base.entity'

// Stok hareket tipi — user-definable, unlimited. Each is a GİRİŞ (in) or ÇIKIŞ (out).
@Entity('inventory_stock_movement_types')
export class StockMovementType extends BaseEntity {
  @Column()
  name!: string

  @Column()
  direction!: MovementDirection

  @Column({ default: true })
  isActive!: boolean

  /** Seeded type used by automatic postings (invoice etc.); not user-deletable. */
  @Column({ default: false })
  isSystem!: boolean
}
