import { Column, Entity, Index } from 'typeorm'

import type { ActivityPriority, ActivityStatus, ActivityType } from '@turbohesap/shared'

import { BaseEntity } from '../../../common/entities/base.entity'

// Etkinlik (CRM activity) — note/call/meeting/email/task on a contact / opportunity.
@Entity('contact_activities')
export class Activity extends BaseEntity {
  @Index()
  @Column({ type: 'uuid', nullable: true })
  contactId!: string | null

  @Column({ type: 'uuid', nullable: true })
  contactPersonId!: string | null

  @Index()
  @Column({ type: 'uuid', nullable: true })
  opportunityId!: string | null

  @Column({ default: 'note' })
  activityType!: ActivityType

  @Column()
  subject!: string

  @Column({ type: 'text', nullable: true })
  description!: string | null

  @Column({ default: 'open' })
  status!: ActivityStatus

  @Column({ default: 'normal' })
  priority!: ActivityPriority

  @Column({ type: 'timestamptz', nullable: true })
  dueDate!: Date | null

  @Column({ type: 'timestamptz', nullable: true })
  startAt!: Date | null

  @Column({ type: 'timestamptz', nullable: true })
  endAt!: Date | null

  @Column({ type: 'uuid', nullable: true })
  ownerId!: string | null

  // User ids @mentioned in the description (parsed on write).
  @Column({ type: 'jsonb', default: () => "'[]'" })
  mentions!: string[]

  // When a due/overdue reminder was emitted (cron idempotency).
  @Column({ type: 'timestamptz', nullable: true })
  remindedAt!: Date | null

  @Column({ type: 'timestamptz', nullable: true })
  completedAt!: Date | null
}
