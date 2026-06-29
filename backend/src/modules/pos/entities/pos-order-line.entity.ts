import { Column, Entity, Index } from 'typeorm'

import type { KitchenStatus } from '@turbohesap/shared'

import { BaseEntity } from '../../../common/entities/base.entity'
import { decimalTransformer } from '../../../common/decimal.transformer'

@Entity('pos_order_lines')
export class PosOrderLine extends BaseEntity {
  @Index()
  @Column({ type: 'uuid' })
  orderId!: string

  @Column({ type: 'uuid', nullable: true })
  productId!: string | null

  @Column({ type: 'uuid', nullable: true })
  variantId!: string | null

  @Column()
  name!: string

  @Column('numeric', { precision: 18, scale: 4, default: 1, transformer: decimalTransformer })
  qty!: number

  @Column('numeric', { precision: 18, scale: 4, default: 0, transformer: decimalTransformer })
  unitPrice!: number

  @Column('numeric', { precision: 5, scale: 2, default: 0, transformer: decimalTransformer })
  discount!: number

  @Column('numeric', { precision: 5, scale: 2, default: 0, transformer: decimalTransformer })
  taxRate!: number

  @Column('numeric', { precision: 18, scale: 2, default: 0, transformer: decimalTransformer })
  lineTotal!: number

  @Column({ default: 'new' })
  kitchenStatus!: KitchenStatus

  @Column({ type: 'uuid', nullable: true })
  stationId!: string | null

  @Column({ type: 'text', nullable: true })
  notes!: string | null

  // Bundle: a server-generated component line handed out with its parent line.
  @Column({ default: false })
  isBundleChild!: boolean

  @Column({ type: 'uuid', nullable: true })
  bundleParentLineId!: string | null

  // Whether this line deducts stock on settle (bundle children may opt out).
  @Column({ default: true })
  deductStock!: boolean

  // Return (geri giriş): whether this line can be returned to stock, and how
  // many of its units already were.
  @Column({ default: false })
  returnable!: boolean

  @Column('numeric', { precision: 18, scale: 4, default: 0, transformer: decimalTransformer })
  returnedQty!: number

  @Column({ type: 'int', default: 0 })
  sortOrder!: number
}
