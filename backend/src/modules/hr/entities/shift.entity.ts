import { Column, Entity, Index } from 'typeorm'

import type { ShiftBreak } from '@turbohesap/shared'

import { BaseEntity } from '../../../common/entities/base.entity'

// Vardiya tanımı — reusable shift template. Breaks stored inline as jsonb.
@Entity('hr_shifts')
export class Shift extends BaseEntity {
  @Column()
  name!: string

  @Column({ default: '' })
  code!: string

  @Column({ type: 'time' })
  startTime!: string

  @Column({ type: 'time' })
  endTime!: string

  @Column({ default: false })
  crossesMidnight!: boolean

  @Column({ type: 'int', default: 0 })
  expectedMinutes!: number

  @Column({ type: 'int', default: 0 })
  lateGraceMin!: number

  @Column({ type: 'int', default: 0 })
  earlyLeaveGraceMin!: number

  @Column({ type: 'int', default: 0 })
  earlyInClampMin!: number

  @Column({ default: '#2563eb' })
  color!: string

  @Column({ default: false })
  isDayOff!: boolean

  @Column({ type: 'jsonb', default: () => "'[]'" })
  breaks!: ShiftBreak[]

  @Index()
  @Column({ type: 'uuid', nullable: true })
  branchId!: string | null

  @Column({ default: true })
  isActive!: boolean

  @Column({ type: 'text', nullable: true })
  notes!: string | null
}
