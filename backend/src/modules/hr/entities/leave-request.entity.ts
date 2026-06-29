import { Column, Entity, Index } from 'typeorm'

import type { LeaveStatus } from '@turbohesap/shared'

import { BaseEntity } from '../../../common/entities/base.entity'
import { decimalTransformer } from '../../../common/decimal.transformer'

// İzin talebi + onay akışı (pending → approved/rejected).
@Entity('hr_leave_requests')
export class LeaveRequest extends BaseEntity {
  @Index()
  @Column({ type: 'uuid' })
  employeeId!: string

  @Index()
  @Column({ type: 'uuid' })
  leaveTypeId!: string

  @Column({ type: 'date' })
  startDate!: string

  @Column({ type: 'date' })
  endDate!: string

  /** Number of leave days (inclusive). */
  @Column('numeric', { precision: 6, scale: 1, default: 0, transformer: decimalTransformer })
  days!: number

  @Column({ type: 'text', nullable: true })
  reason!: string | null

  @Index()
  @Column({ default: 'pending' })
  status!: LeaveStatus

  @Column({ type: 'uuid', nullable: true })
  approvedById!: string | null
}
