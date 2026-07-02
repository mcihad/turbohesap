import { Column, Entity, Index } from 'typeorm'

import type { PlanningRunStatus } from '@turbohesap/shared'

import { BaseEntity } from '../../../common/entities/base.entity'

// MRP planlama koşusu (header). Öneriler production_planning_suggestions'ta.
@Entity('production_planning_runs')
export class PlanningRun extends BaseEntity {
  @Index({ unique: true })
  @Column()
  runNo!: string

  @Column({ type: 'date' })
  runDate!: string

  @Index()
  @Column({ default: 'draft' })
  status!: PlanningRunStatus

  @Column({ type: 'int', default: 30 })
  horizonDays!: number

  @Column({ type: 'uuid', nullable: true })
  branchId!: string | null

  @Column({ type: 'text', nullable: true })
  notes!: string | null
}
