import { Column, Entity, Index } from 'typeorm'
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

  @Column('numeric', {
    precision: 18,
    scale: 2,
    default: 0,
    transformer: {
      to: (v: number) => v,
      from: (v: string | null) => (v == null ? 0 : Number(v)),
    },
  })
  openingBalance!: number

  @Column({ default: '' })
  description!: string

  @Column({ default: true })
  isActive!: boolean

  @Index()
  @Column({ type: 'uuid', nullable: true })
  branchId!: string | null
}
