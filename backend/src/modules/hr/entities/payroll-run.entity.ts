import { Column, Entity, Index } from 'typeorm'

import type { PayrollRunStatus } from '@turbohesap/shared'

import { BaseEntity } from '../../../common/entities/base.entity'

// Bordro dönemi — one run per (year, month). Holds the period's payslips.
@Entity('hr_payroll_runs')
@Index(['year', 'month'], { unique: true })
export class PayrollRun extends BaseEntity {
  @Column({ type: 'int' })
  year!: number

  @Column({ type: 'int' })
  month!: number

  @Column({ default: 'draft' })
  status!: PayrollRunStatus

  @Index()
  @Column({ type: 'uuid', nullable: true })
  branchId!: string | null

  @Column({ type: 'text', nullable: true })
  notes!: string | null
}
