import { Column, Entity } from 'typeorm'

import { BaseEntity } from '../../../common/entities/base.entity'

// İzin türü (yıllık, ücretsiz, hastalık, mazeret…).
@Entity('hr_leave_types')
export class LeaveType extends BaseEntity {
  @Column({ default: '' })
  name!: string

  /** Paid leave (counts as a worked day for payroll). */
  @Column({ default: true })
  paid!: boolean

  /** Deducts from the annual paid-leave balance (yıllık izin). */
  @Column({ default: false })
  affectsAnnualBalance!: boolean

  @Column({ default: true })
  isActive!: boolean

  @Column({ type: 'int', default: 0 })
  sortOrder!: number
}
