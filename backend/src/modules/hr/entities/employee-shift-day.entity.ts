import { Column, Entity, Index } from 'typeorm'

import type { ShiftDaySource, ShiftDayStatus } from '@turbohesap/shared'

import { BaseEntity } from '../../../common/entities/base.entity'

// Materialize edilmiş vardiya takvimi — one row per employee per day. shiftId null
// = OFF. UNIQUE(employeeId, workDate).
@Entity('hr_employee_shift_days')
@Index(['employeeId', 'workDate'], { unique: true })
export class EmployeeShiftDay extends BaseEntity {
  @Index()
  @Column({ type: 'uuid' })
  employeeId!: string

  @Column({ type: 'date' })
  workDate!: string

  @Column({ type: 'uuid', nullable: true })
  shiftId!: string | null

  @Column({ default: 'rotation' })
  source!: ShiftDaySource

  @Column({ default: 'draft' })
  status!: ShiftDayStatus
}
