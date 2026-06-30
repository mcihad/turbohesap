import { Column, Entity } from 'typeorm'

import type { RotationDay } from '@turbohesap/shared'

import { BaseEntity } from '../../../common/entities/base.entity'

// Vardiya rotasyon/döngü şablonu. `days` is one slot per cycle day (jsonb).
@Entity('hr_shift_rotations')
export class ShiftRotation extends BaseEntity {
  @Column()
  name!: string

  @Column({ type: 'int', default: 1 })
  cycleLengthDays!: number

  @Column({ type: 'date' })
  anchorDate!: string

  @Column({ type: 'jsonb', default: () => "'[]'" })
  days!: RotationDay[]

  @Column({ type: 'text', nullable: true })
  description!: string | null

  @Column({ default: true })
  isActive!: boolean
}
