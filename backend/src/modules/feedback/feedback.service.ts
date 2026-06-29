import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { In, Repository } from 'typeorm'

import type { FeedbackDto, FeedbackListQuery } from '@turbohesap/shared'

import { Feedback } from './entities/feedback.entity'
import { FileEntity } from '../files/entities/file.entity'
import { User } from '../iam/entities/user.entity'
import { displayName } from '../contacts/user-name.util'
import type { CreateFeedbackDto } from './dto/create-feedback.dto'
import type { UpdateFeedbackDto } from './dto/update-feedback.dto'

@Injectable()
export class FeedbackService {
  constructor(
    @InjectRepository(Feedback) private readonly feedback: Repository<Feedback>,
    @InjectRepository(FileEntity) private readonly files: Repository<FileEntity>,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  async list(query?: FeedbackListQuery): Promise<FeedbackDto[]> {
    const where: Record<string, unknown> = {}
    if (query?.type) where.type = query.type
    if (query?.status) where.status = query.status
    if (query?.createdById) where.createdById = query.createdById
    const rows = await this.feedback.find({ where, order: { createdAt: 'DESC' }, take: 500 })
    return this.assembleMany(rows)
  }

  async get(id: string): Promise<FeedbackDto> {
    return (await this.assembleMany([await this.findOrFail(id)]))[0]
  }

  async create(dto: CreateFeedbackDto, userId: string): Promise<FeedbackDto> {
    const saved = await this.feedback.save(
      this.feedback.create({
        type: dto.type,
        title: (dto.title ?? '').trim(),
        message: dto.message.trim(),
        status: 'new',
        priority: 'normal',
        pageUrl: dto.pageUrl ?? null,
        screenshotFileId: dto.screenshotFileId ?? null,
        createdById: userId,
      }),
    )
    // Attach the (previously uploaded, unattached) screenshot file to this record.
    if (dto.screenshotFileId) {
      await this.files.update(
        { id: dto.screenshotFileId },
        { entityType: 'Feedback', entityId: saved.id },
      )
    }
    return this.get(saved.id)
  }

  async update(id: string, dto: UpdateFeedbackDto): Promise<FeedbackDto> {
    const f = await this.findOrFail(id)
    if (dto.status !== undefined) f.status = dto.status
    if (dto.priority !== undefined) f.priority = dto.priority
    if (dto.type !== undefined) f.type = dto.type
    if (dto.title !== undefined) f.title = dto.title.trim()
    if (dto.message !== undefined) f.message = dto.message.trim()
    await this.feedback.save(f)
    return this.get(id)
  }

  async remove(id: string): Promise<void> {
    const f = await this.findOrFail(id)
    if (f.screenshotFileId) {
      await this.files.delete({ id: f.screenshotFileId })
    }
    await this.feedback.delete({ id })
  }

  private async findOrFail(id: string): Promise<Feedback> {
    const f = await this.feedback.findOne({ where: { id } })
    if (!f) throw new NotFoundException('Geri bildirim bulunamadı')
    return f
  }

  private async assembleMany(rows: Feedback[]): Promise<FeedbackDto[]> {
    if (rows.length === 0) return []
    const userIds = [...new Set(rows.map((r) => r.createdById).filter(Boolean))]
    const fileIds = [...new Set(rows.map((r) => r.screenshotFileId).filter((x): x is string => !!x))]
    const [users, files] = await Promise.all([
      userIds.length ? this.users.find({ where: { id: In(userIds) } }) : Promise.resolve([]),
      fileIds.length ? this.files.find({ where: { id: In(fileIds) } }) : Promise.resolve([]),
    ])
    const userMap = new Map(users.map((u) => [u.id, displayName(u)]))
    const fileMap = new Map(files.map((f) => [f.id, f.storedName]))
    return rows.map((r) => {
      const storedName = r.screenshotFileId ? fileMap.get(r.screenshotFileId) ?? null : null
      return {
        id: r.id,
        type: r.type,
        title: r.title,
        message: r.message,
        status: r.status,
        priority: r.priority,
        pageUrl: r.pageUrl,
        screenshotFileId: r.screenshotFileId,
        screenshotUrl: storedName ? `/api/files/raw/${storedName}` : null,
        createdById: r.createdById,
        createdByName: userMap.get(r.createdById) ?? '',
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      }
    })
  }
}
