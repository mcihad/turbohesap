import { Column, Entity, Index } from 'typeorm'

import { BaseEntity } from '../../../common/entities/base.entity'

// Personel↔giriş alanı ataması (M:N). If an employee has NO rows here, they may
// check in from ANY active area (handled in the service).
@Entity('hr_employee_checkin_areas')
@Index(['employeeId', 'areaId'], { unique: true })
export class EmployeeCheckinArea extends BaseEntity {
  @Index()
  @Column({ type: 'uuid' })
  employeeId!: string

  @Index()
  @Column({ type: 'uuid' })
  areaId!: string
}
