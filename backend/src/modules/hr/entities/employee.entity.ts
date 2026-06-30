import { Column, Entity, Index } from 'typeorm'

import type { EmploymentType, SalaryType, SgkStatus } from '@turbohesap/shared'

import { BaseEntity } from '../../../common/entities/base.entity'
import { decimalTransformer } from '../../../common/decimal.transformer'

// Personel — distinct from a Contact (customer/supplier). Optionally linked to an
// iam User (`userId`) when the person also has an app login.
@Entity('hr_employees')
export class Employee extends BaseEntity {
  @Column({ default: '' })
  firstName!: string

  @Column({ default: '' })
  lastName!: string

  @Column({ default: '' })
  tcKimlikNo!: string

  @Column({ type: 'date', nullable: true })
  birthDate!: string | null

  @Column({ type: 'date' })
  hireDate!: string

  @Column({ type: 'date', nullable: true })
  terminationDate!: string | null

  @Column({ type: 'varchar', nullable: true })
  departmentKey!: string | null

  @Column({ type: 'varchar', nullable: true })
  positionKey!: string | null

  @Column({ default: 'full_time' })
  employmentType!: EmploymentType

  @Column({ default: 'gross' })
  salaryType!: SalaryType

  @Column('numeric', { precision: 18, scale: 2, default: 0, transformer: decimalTransformer })
  salaryAmount!: number

  @Column({ type: 'varchar', nullable: true })
  sgkSicilNo!: string | null

  @Column({ default: 'normal' })
  sgkStatus!: SgkStatus

  @Column({ type: 'varchar', nullable: true })
  iban!: string | null

  @Column({ type: 'varchar', nullable: true })
  bankName!: string | null

  @Column({ type: 'varchar', nullable: true })
  phone!: string | null

  @Column({ type: 'varchar', nullable: true })
  email!: string | null

  @Column({ type: 'text', nullable: true })
  address!: string | null

  @Index()
  @Column({ type: 'uuid', nullable: true })
  branchId!: string | null

  @Index()
  @Column({ type: 'uuid', nullable: true })
  userId!: string | null

  // PDKS — primary card-access mapping (printed decimal card number, string to keep
  // leading zeros). Fallbacks live in hr_employee_cards.
  @Index()
  @Column({ type: 'varchar', nullable: true })
  cardNo!: string | null

  @Column({ type: 'int', default: 14 })
  annualLeaveDays!: number

  @Column({ default: true })
  isActive!: boolean

  @Column({ type: 'text', nullable: true })
  notes!: string | null
}
