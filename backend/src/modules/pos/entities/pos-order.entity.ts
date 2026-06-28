import { Column, Entity, Index } from 'typeorm'

import type { PosOrderStatus, PosOrderType } from '@turbohesap/shared'

import { BaseEntity } from '../../../common/entities/base.entity'
import { decimalTransformer } from '../../../common/decimal.transformer'

const money = { precision: 18, scale: 2, default: 0, transformer: decimalTransformer } as const

// A POS order (fiş). Lines + payments are separate rows. Idempotent on clientRef.
@Entity('pos_orders')
export class PosOrder extends BaseEntity {
  @Index({ unique: true })
  @Column()
  clientRef!: string

  @Index()
  @Column({ type: 'uuid', nullable: true })
  sessionId!: string | null

  @Index()
  @Column({ type: 'uuid' })
  registerId!: string

  @Index()
  @Column({ type: 'uuid' })
  branchId!: string

  @Column({ type: 'uuid', nullable: true })
  salesChannelId!: string | null

  @Column({ default: 'takeaway' })
  orderType!: PosOrderType

  @Column({ type: 'uuid', nullable: true })
  tableId!: string | null

  @Column({ type: 'uuid', nullable: true })
  contactId!: string | null

  @Index()
  @Column({ default: 'open' })
  status!: PosOrderStatus

  @Column({ default: '' })
  orderNo!: string

  @Column({ default: 'TRY' })
  currencyCode!: string

  @Column('numeric', money)
  subtotal!: number

  @Column('numeric', money)
  discountTotal!: number

  @Column('numeric', money)
  taxTotal!: number

  @Column('numeric', money)
  grandTotal!: number

  @Column('numeric', money)
  paidTotal!: number

  @Column('numeric', money)
  changeDue!: number

  @Column({ default: true })
  taxInclusive!: boolean

  @Column({ type: 'text', nullable: true })
  notes!: string | null

  @Column({ type: 'uuid', nullable: true })
  parentOrderId!: string | null
}
