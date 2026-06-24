import { createHash } from 'node:crypto'

import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Brackets, Repository } from 'typeorm'

import type {
  ErrorLogDto,
  ErrorLogOrigin,
  ErrorLogQuery,
  Page,
  UpdateErrorLogRequest,
} from '@turbohesap/shared'

import { ErrorLog } from '../entities/error-log.entity'
import { toErrorLogDto } from '../mappers'

const DEFAULT_PAGE_SIZE = 20
const MAX_PAGE_SIZE = 100

// Everything needed to record one error occurrence. Built by the exception
// filter (server) or the client report endpoint.
export interface CaptureErrorInput {
  origin: ErrorLogOrigin
  message: string
  exceptionType: string
  stackTrace?: string | null
  source?: string | null
  fileName?: string | null
  lineNumber?: number | null
  httpMethod?: string | null
  path?: string | null
  queryString?: string | null
  statusCode?: number
  ipAddress?: string | null
  userAgent?: string | null
  headers?: Record<string, string> | null
  userId?: string | null
  userName?: string | null
  module?: string | null
}

@Injectable()
export class ErrorLogsService {
  constructor(
    @InjectRepository(ErrorLog)
    private readonly repo: Repository<ErrorLog>,
  ) {}

  // Idempotent-ish: same fingerprint folds into one row (occurrenceCount++).
  // Never throws — capture must not mask the original error.
  async capture(input: CaptureErrorInput): Promise<void> {
    try {
      const hash = this.fingerprint(input)
      const now = new Date()
      const existing = await this.repo.findOne({ where: { hash } })
      if (existing) {
        await this.repo.update(
          { id: existing.id },
          {
            occurrenceCount: existing.occurrenceCount + 1,
            lastSeenAt: now,
            message: input.message,
            path: input.path ?? existing.path,
            userId: input.userId ?? existing.userId,
            userName: input.userName ?? existing.userName,
          },
        )
        return
      }
      try {
        await this.repo.insert({
          hash,
          origin: input.origin,
          module: input.module ?? this.moduleFromPath(input.path),
          message: input.message,
          exceptionType: input.exceptionType,
          stackTrace: input.stackTrace ?? null,
          source: input.source ?? null,
          fileName: input.fileName ?? null,
          lineNumber: input.lineNumber ?? null,
          httpMethod: input.httpMethod ?? null,
          path: input.path ?? null,
          queryString: input.queryString ?? null,
          statusCode: input.statusCode ?? 500,
          ipAddress: input.ipAddress ?? null,
          userAgent: input.userAgent ?? null,
          headers: input.headers ?? null,
          userId: input.userId ?? null,
          userName: input.userName ?? null,
          status: 'new',
          occurrenceCount: 1,
          firstSeenAt: now,
          lastSeenAt: now,
        })
      } catch {
        // Race on the unique hash — another request inserted it first; count it.
        await this.repo
          .createQueryBuilder()
          .update(ErrorLog)
          .set({
            occurrenceCount: () => '"occurrence_count" + 1',
            lastSeenAt: now,
          })
          .where('hash = :hash', { hash })
          .execute()
      }
    } catch {
      // swallow — logging an error must never throw
    }
  }

  async list(query: ErrorLogQuery): Promise<Page<ErrorLogDto>> {
    const page = Math.max(1, Number(query.page) || 1)
    const pageSize = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, Number(query.pageSize) || DEFAULT_PAGE_SIZE),
    )

    const qb = this.repo.createQueryBuilder('e')
    if (query.origin) qb.andWhere('e.origin = :o', { o: query.origin })
    if (query.status) qb.andWhere('e.status = :st', { st: query.status })
    if (query.module) qb.andWhere('e.module = :m', { m: query.module })
    if (query.statusCode)
      qb.andWhere('e.statusCode = :sc', { sc: Number(query.statusCode) })
    if (query.from) qb.andWhere('e.lastSeenAt >= :from', { from: query.from })
    if (query.to) qb.andWhere('e.lastSeenAt <= :to', { to: query.to })
    if (query.search) {
      const s = `%${query.search}%`
      qb.andWhere(
        new Brackets((w) => {
          w.where('e.message ILIKE :s', { s })
            .orWhere('e.exceptionType ILIKE :s', { s })
            .orWhere('e.path ILIKE :s', { s })
            .orWhere('e.userName ILIKE :s', { s })
        }),
      )
    }

    qb.orderBy('e.lastSeenAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)

    const [rows, total] = await qb.getManyAndCount()
    return { items: rows.map(toErrorLogDto), total, page, pageSize }
  }

  async get(id: string): Promise<ErrorLogDto> {
    return toErrorLogDto(await this.findOrFail(id))
  }

  async update(id: string, dto: UpdateErrorLogRequest): Promise<ErrorLogDto> {
    const log = await this.findOrFail(id)
    if (dto.status !== undefined) log.status = dto.status
    if (dto.developerNotes !== undefined) log.developerNotes = dto.developerNotes
    await this.repo.save(log)
    return toErrorLogDto(log)
  }

  async remove(id: string): Promise<void> {
    const log = await this.findOrFail(id)
    await this.repo.remove(log)
  }

  private async findOrFail(id: string): Promise<ErrorLog> {
    const log = await this.repo.findOne({ where: { id } })
    if (!log) throw new NotFoundException('error log not found')
    return log
  }

  private fingerprint(input: CaptureErrorInput): string {
    const frame =
      (input.stackTrace ?? '')
        .split('\n')
        .map((l) => l.trim())
        .find((l) => l.startsWith('at ')) ?? ''
    const basis = [input.origin, input.exceptionType, input.message, frame].join(
      '',
    )
    return createHash('sha256').update(basis).digest('hex')
  }

  private moduleFromPath(path?: string | null): string | null {
    if (!path) return null
    const segs = path.replace(/^\/+/, '').split('/').filter(Boolean)
    // strip a leading "api" prefix → first meaningful segment is the module
    const first = segs[0] === 'api' ? segs[1] : segs[0]
    return first ?? null
  }
}
