import { Column, Entity, Index } from 'typeorm'

import { BaseEntity } from '../../../common/entities/base.entity'
import { decimalTransformer } from '../../../common/decimal.transformer'

// Puantaj — one row per employee per month, feeding payroll's day count.
@Entity('hr_timesheets')
@Index(['employeeId', 'year', 'month'], { unique: true })
export class Timesheet extends BaseEntity {
  @Index()
  @Column({ type: 'uuid' })
  employeeId!: string

  @Column({ type: 'int' })
  year!: number

  @Column({ type: 'int' })
  month!: number

  @Column('numeric', { precision: 5, scale: 1, default: 30, transformer: decimalTransformer })
  workedDays!: number

  @Column('numeric', { precision: 5, scale: 1, default: 0, transformer: decimalTransformer })
  weekendDays!: number

  @Column('numeric', { precision: 5, scale: 1, default: 0, transformer: decimalTransformer })
  holidayDays!: number

  @Column('numeric', { precision: 6, scale: 1, default: 0, transformer: decimalTransformer })
  overtimeHours!: number

  @Column('numeric', { precision: 5, scale: 1, default: 0, transformer: decimalTransformer })
  absentDays!: number

  @Column('numeric', { precision: 5, scale: 1, default: 0, transformer: decimalTransformer })
  paidLeaveDays!: number

  @Column('numeric', { precision: 5, scale: 1, default: 0, transformer: decimalTransformer })
  unpaidLeaveDays!: number

  @Column({ type: 'text', nullable: true })
  notes!: string | null
}
