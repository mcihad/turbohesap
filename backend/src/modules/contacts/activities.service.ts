import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import type { ActivityDto, ActivityListQuery } from '@turbohesap/shared'

import { Activity } from './entities/activity.entity'
import { User } from '../iam/entities/user.entity'
import { NotificationsService } from './notifications.service'
import type { CreateActivityDto, UpdateActivityDto } from './dto/activity.dto'

@Injectable()
export class ActivitiesService {
  constructor(
    @InjectRepository(Activity) private readonly activities: Repository<Activity>,
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly notifications: NotificationsService,
  ) {}

  async list(query?: ActivityListQuery): Promise<ActivityDto[]> {
    const qb = this.activities.createQueryBuilder('a')
    if (query?.contactId) qb.andWhere('a.contactId = :contactId', { contactId: query.contactId })
    if (query?.opportunityId) qb.andWhere('a.opportunityId = :opportunityId', { opportunityId: query.opportunityId })
    if (query?.status) qb.andWhere('a.status = :status', { status: query.status })
    if (query?.activityType) qb.andWhere('a.activityType = :activityType', { activityType: query.activityType })
    qb.orderBy('a.dueDate', 'ASC', 'NULLS LAST').addOrderBy('a.createdAt', 'DESC')
    const rows = await qb.getMany()
    return rows.map(toActivityDto)
  }

  async get(id: string): Promise<ActivityDto> {
    return toActivityDto(await this.findOrFail(id))
  }

  async create(dto: CreateActivityDto, actor: string | null): Promise<ActivityDto> {
    const status = dto.status ?? 'open'
    const mentions = await this.parseMentions(dto.description)
    const activity = this.activities.create({
      contactId: dto.contactId ?? null,
      contactPersonId: dto.contactPersonId ?? null,
      opportunityId: dto.opportunityId ?? null,
      activityType: dto.activityType,
      subject: dto.subject.trim(),
      description: dto.description ?? null,
      status,
      priority: dto.priority ?? 'normal',
      dueDate: parseDate(dto.dueDate),
      startAt: parseDate(dto.startAt),
      endAt: parseDate(dto.endAt),
      ownerId: dto.ownerId ?? actor,
      mentions,
      completedAt: status === 'completed' ? new Date() : null,
    })
    const saved = await this.activities.save(activity)
    await this.notifyMentions(saved, [], actor)
    await this.notifyAssignment(saved, null, actor)
    return toActivityDto(saved)
  }

  async update(id: string, dto: UpdateActivityDto, actor: string | null): Promise<ActivityDto> {
    const activity = await this.findOrFail(id)
    const prevMentions = activity.mentions ?? []
    const prevOwner = activity.ownerId
    if (dto.activityType !== undefined) activity.activityType = dto.activityType
    if (dto.subject !== undefined) activity.subject = dto.subject.trim()
    if (dto.contactId !== undefined) activity.contactId = dto.contactId
    if (dto.contactPersonId !== undefined) activity.contactPersonId = dto.contactPersonId
    if (dto.opportunityId !== undefined) activity.opportunityId = dto.opportunityId
    if (dto.description !== undefined) {
      activity.description = dto.description
      activity.mentions = await this.parseMentions(dto.description)
    }
    if (dto.priority !== undefined) activity.priority = dto.priority
    if (dto.dueDate !== undefined) {
      activity.dueDate = parseDate(dto.dueDate)
      activity.remindedAt = null // re-arm the reminder for the new due date
    }
    if (dto.startAt !== undefined) activity.startAt = parseDate(dto.startAt)
    if (dto.endAt !== undefined) activity.endAt = parseDate(dto.endAt)
    if (dto.ownerId !== undefined) activity.ownerId = dto.ownerId
    if (dto.status !== undefined && dto.status !== activity.status) {
      activity.status = dto.status
      activity.completedAt = dto.status === 'completed' ? new Date() : null
    }
    const saved = await this.activities.save(activity)
    await this.notifyMentions(saved, prevMentions, actor)
    await this.notifyAssignment(saved, prevOwner, actor)
    return toActivityDto(saved)
  }

  async remove(id: string): Promise<void> {
    const activity = await this.findOrFail(id)
    await this.activities.remove(activity)
  }

  // ── notifications ──
  /** Extract @username tokens → user ids. */
  private async parseMentions(description?: string | null): Promise<string[]> {
    if (!description) return []
    const names = [...description.matchAll(/@([A-Za-z0-9_.]+)/g)].map((m) => m[1].toLowerCase())
    if (names.length === 0) return []
    const users = await this.users.find()
    const ids = users.filter((u) => names.includes(u.username.toLowerCase())).map((u) => u.id)
    return [...new Set(ids)]
  }

  private async notifyMentions(a: Activity, prev: string[], actor: string | null): Promise<void> {
    const fresh = (a.mentions ?? []).filter((uid) => !prev.includes(uid) && uid !== actor)
    for (const uid of fresh) {
      await this.notifications.emit({
        userId: uid,
        type: 'mention',
        title: 'Bir notta etiketlendiniz',
        body: a.subject,
        entityType: 'Activity',
        entityId: a.id,
      })
    }
  }

  private async notifyAssignment(a: Activity, prevOwner: string | null, actor: string | null): Promise<void> {
    if (a.ownerId && a.ownerId !== prevOwner && a.ownerId !== actor) {
      await this.notifications.emit({
        userId: a.ownerId,
        type: 'assignment',
        title: 'Size bir etkinlik atandı',
        body: a.subject,
        entityType: 'Activity',
        entityId: a.id,
      })
    }
  }

  private async findOrFail(id: string): Promise<Activity> {
    const activity = await this.activities.findOne({ where: { id } })
    if (!activity) throw new NotFoundException('Etkinlik bulunamadı')
    return activity
  }
}

function parseDate(v?: string | null): Date | null {
  return v ? new Date(v) : null
}

export function toActivityDto(a: Activity): ActivityDto {
  return {
    id: a.id,
    contactId: a.contactId,
    contactPersonId: a.contactPersonId,
    opportunityId: a.opportunityId,
    activityType: a.activityType,
    subject: a.subject,
    description: a.description,
    status: a.status,
    priority: a.priority,
    dueDate: a.dueDate ? a.dueDate.toISOString() : null,
    startAt: a.startAt ? a.startAt.toISOString() : null,
    endAt: a.endAt ? a.endAt.toISOString() : null,
    ownerId: a.ownerId,
    mentions: a.mentions ?? [],
    completedAt: a.completedAt ? a.completedAt.toISOString() : null,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  }
}
