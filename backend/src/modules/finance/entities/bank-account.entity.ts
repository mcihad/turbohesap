import { Column, Entity } from 'typeorm'
import { BaseEntity } from '../../../common/entities/base.entity'

@Entity('finance_bank_accounts')
export class BankAccount extends BaseEntity {
  @Column()
  name!: string

  @Column()
  bankName!: string

  @Column({ default: '' })
  branchName!: string

  @Column({ default: '' })
  branchCode!: string

  @Column({ default: '' })
  accountNumber!: string

  @Column()
  iban!: string

  @Column()
  currency!: string

  @Column({ type: 'double precision', default: 0 })
  openingBalance!: number

  @Column({ default: '' })
  description!: string

  @Column({ default: true })
  isActive!: boolean
}
