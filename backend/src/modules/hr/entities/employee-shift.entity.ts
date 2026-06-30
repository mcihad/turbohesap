import { Column, Entity, Index } from 'typeorm'

import { BaseEntity } from '../../../common/entities/base.entity'

// Personel vardiya ataması (kural katmanı) — an employee follows a rotation (at an
// offset) or a fixed shift over a date range. The materialized calendar
// (hr_employee_shift_days) is generated from these.
@Entity('hr_employee_shifts')
export class EmployeeShift extends BaseEntity {
  @Index()
  @Column({ type: 'uuid' })
  employeeId!: string

  @Index()
  @Column({ type: 'uuid', nullable: true })
  rotationId!: string | null

  @Column({ type: 'int', default: 0 })
  rotationOffset!: number

  @Column({ type: 'uuid', nullable: true })
  fixedShiftId!: string | null

  @Column({ type: 'date' })
  effectiveFrom!: string

  @Column({ type: 'date', nullable: true })
  effectiveTo!: string | null
}
