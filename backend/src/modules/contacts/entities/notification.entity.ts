import { Column, Entity, Index } from 'typeorm'

import type { NotificationType } from '@turbohesap/shared'

import { BaseEntity } from '../../../common/entities/base.entity'

// In-app notification for a single user. High-churn → excluded from audit.
@Entity('crm_notifications')
@Index(['userId', 'readAt'])
export class Notification extends BaseEntity {
  @Index()
  @Column({ type: 'uuid' })
  userId!: string

  @Column()
  type!: NotificationType

  @Column()
  title!: string

  @Column({ type: 'text', nullable: true })
  body!: string | null

  @Column({ type: 'varchar', nullable: true })
  entityType!: string | null

  @Column({ type: 'uuid', nullable: true })
  entityId!: string | null

  @Column({ type: 'timestamptz', nullable: true })
  readAt!: Date | null
}
