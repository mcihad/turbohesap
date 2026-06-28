import { Column, Entity, Index } from 'typeorm'

import { BaseEntity } from '../../../common/entities/base.entity'
import { decimalTransformer } from '../../../common/decimal.transformer'

// Snapshot of a chosen modifier option on an order line (history is immutable).
@Entity('pos_order_line_modifiers')
export class PosOrderLineModifier extends BaseEntity {
  @Index()
  @Column({ type: 'uuid' })
  lineId!: string

  @Column()
  groupNameSnapshot!: string

  @Column()
  optionNameSnapshot!: string

  @Column('numeric', { precision: 18, scale: 2, default: 0, transformer: decimalTransformer })
  priceDelta!: number

  @Column({ type: 'uuid', nullable: true })
  groupId!: string | null

  @Column({ type: 'uuid', nullable: true })
  optionId!: string | null
}
