import { Column, Entity } from 'typeorm'
import { BaseEntity } from '../../../common/entities/base.entity'

@Entity('finance_cash_accounts')
export class CashAccount extends BaseEntity {
  @Column()
  name!: string

  @Column()
  currency!: string

  @Column({ type: 'double precision', default: 0 })
  openingBalance!: number

  @Column({ default: '' })
  description!: string

  @Column({ default: true })
  isActive!: boolean
}
