import { Column, Entity, Index } from 'typeorm'

import type { PosPaymentMethod } from '@turbohesap/shared'

import { BaseEntity } from '../../../common/entities/base.entity'
import { decimalTransformer } from '../../../common/decimal.transformer'

// One tender on an order (split = many rows). Back-links to the finance/cari
// rows it created, so a void/refund reverses them cleanly (invoices pattern).
@Entity('pos_payments')
export class PosPayment extends BaseEntity {
  @Index()
  @Column({ type: 'uuid' })
  orderId!: string

  @Column()
  method!: PosPaymentMethod

  @Column('numeric', { precision: 18, scale: 2, default: 0, transformer: decimalTransformer })
  amount!: number

  @Column('numeric', { precision: 18, scale: 2, default: 0, transformer: decimalTransformer })
  changeGiven!: number

  @Column({ type: 'uuid', nullable: true })
  cashAccountId!: string | null

  @Column({ type: 'uuid', nullable: true })
  bankAccountId!: string | null

  @Column({ type: 'uuid', nullable: true })
  contactId!: string | null

  @Column({ type: 'uuid', nullable: true })
  financeTransactionId!: string | null

  @Column({ type: 'uuid', nullable: true })
  contactTransactionId!: string | null

  @Column()
  clientRef!: string
}
