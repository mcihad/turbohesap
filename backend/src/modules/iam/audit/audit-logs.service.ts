import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Brackets, Repository } from 'typeorm'

import type {
  AuditLogDto,
  AuditLogQuery,
  Page,
} from '@turbohesap/shared'

import { AuditLog } from '../entities/audit-log.entity'
import { toAuditLogDto } from '../mappers'

const DEFAULT_PAGE_SIZE = 20
const MAX_PAGE_SIZE = 100

@Injectable()
export class AuditLogsService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly repo: Repository<AuditLog>,
  ) {}

  async list(query: AuditLogQuery): Promise<Page<AuditLogDto>> {
    const page = Math.max(1, Number(query.page) || 1)
    const pageSize = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, Number(query.pageSize) || DEFAULT_PAGE_SIZE),
    )

    const qb = this.repo.createQueryBuilder('a')

    if (query.entityType) qb.andWhere('a.entityType = :et', { et: query.entityType })
    if (query.entityId) qb.andWhere('a.entityId = :eid', { eid: query.entityId })
    if (query.module) qb.andWhere('a.module = :mod', { mod: query.module })
    if (query.action) qb.andWhere('a.action = :act', { act: query.action })
    if (query.userId) qb.andWhere('a.userId = :uid', { uid: query.userId })
    if (query.from) qb.andWhere('a.createdAt >= :from', { from: query.from })
    if (query.to) qb.andWhere('a.createdAt <= :to', { to: query.to })
    if (query.search) {
      const s = `%${query.search}%`
      qb.andWhere(
        new Brackets((w) => {
          w.where('a.entityType ILIKE :s', { s })
            .orWhere('a.entityId ILIKE :s', { s })
            .orWhere('a.userName ILIKE :s', { s })
            .orWhere('CAST(a.changes AS text) ILIKE :s', { s })
        }),
      )
    }

    qb.orderBy('a.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)

    const [rows, total] = await qb.getManyAndCount()
    // Light summaries — the diff is lazy-loaded per row via get().
    return { items: rows.map((r) => toAuditLogDto(r, false)), total, page, pageSize }
  }

  async get(id: string): Promise<AuditLogDto> {
    const log = await this.repo.findOne({ where: { id } })
    if (!log) throw new NotFoundException('audit log not found')
    return toAuditLogDto(log)
  }

  async forEntity(
    entityType: string,
    entityId: string,
  ): Promise<AuditLogDto[]> {
    const rows = await this.repo.find({
      where: { entityType, entityId },
      order: { createdAt: 'DESC' },
      take: MAX_PAGE_SIZE,
    })
    return rows.map((r) => toAuditLogDto(r))
  }
}
