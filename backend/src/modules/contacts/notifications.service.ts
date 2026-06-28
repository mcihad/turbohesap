import { Injectable, NotFoundException } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { InjectRepository } from '@nestjs/typeorm'
import { IsNull, LessThanOrEqual, Not, Repository } from 'typeorm'

import {
  type NotificationDto,
  type NotificationListQuery,
  type NotificationType,
  type UnreadCountDto,
} from '@turbohesap/shared'

import { Activity } from './entities/activity.entity'
import { Notification } from './entities/notification.entity'

export interface CreateNotificationInput {
  userId: string
  type: NotificationType
  title: string
  body?: string | null
  entityType?: string | null
  entityId?: string | null
}

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification) private readonly notifications: Repository<Notification>,
    @InjectRepository(Activity) private readonly activities: Repository<Activity>,
  ) {}

  /** Emit a notification (no-op if no recipient). Safe to call from any service. */
  async emit(input: CreateNotificationInput): Promise<void> {
    if (!input.userId) return
    await this.notifications.save(
      this.notifications.create({
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body ?? null,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
        readAt: null,
      }),
    )
  }

  async list(userId: string, query?: NotificationListQuery): Promise<NotificationDto[]> {
    const rows = await this.notifications.find({
      where: query?.unread ? { userId, readAt: IsNull() } : { userId },
      order: { createdAt: 'DESC' },
      take: query?.limit ?? 50,
    })
    return rows.map(toNotificationDto)
  }

  async unreadCount(userId: string): Promise<UnreadCountDto> {
    return { count: await this.notifications.count({ where: { userId, readAt: IsNull() } }) }
  }

  async markRead(userId: string, id: string): Promise<NotificationDto> {
    const n = await this.notifications.findOne({ where: { id, userId } })
    if (!n) throw new NotFoundException('Bildirim bulunamadı')
    if (!n.readAt) {
      n.readAt = new Date()
      await this.notifications.save(n)
    }
    return toNotificationDto(n)
  }

  async markAllRead(userId: string): Promise<void> {
    await this.notifications.update({ userId, readAt: IsNull() }, { readAt: new Date() })
  }

  // Hourly: notify owners of activities that are now due/overdue and not yet
  // completed/cancelled. Idempotent via Activity.remindedAt.
  @Cron(CronExpression.EVERY_HOUR)
  async remindDueActivities(): Promise<void> {
    const now = new Date()
    const due = await this.activities.find({
      where: {
        dueDate: LessThanOrEqual(now),
        remindedAt: IsNull(),
        ownerId: Not(IsNull()),
      },
      take: 200,
    })
    for (const a of due) {
      if (a.status === 'completed' || a.status === 'cancelled') {
        a.remindedAt = now
        await this.activities.save(a)
        continue
      }
      await this.emit({
        userId: a.ownerId as string,
        type: 'activity_due',
        title: 'Etkinlik zamanı geldi',
        body: a.subject,
        entityType: 'Activity',
        entityId: a.id,
      })
      a.remindedAt = now
      await this.activities.save(a)
    }
  }
}

export function toNotificationDto(n: Notification): NotificationDto {
  return {
    id: n.id,
    userId: n.userId,
    type: n.type,
    title: n.title,
    body: n.body,
    entityType: n.entityType,
    entityId: n.entityId,
    readAt: n.readAt ? n.readAt.toISOString() : null,
    createdAt: n.createdAt.toISOString(),
  }
}
