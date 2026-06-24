import { toAuditLogDto, toErrorLogDto } from './mappers'
import type { AuditLog } from './entities/audit-log.entity'
import type { ErrorLog } from './entities/error-log.entity'

describe('mappers', () => {
  it('toAuditLogDto: changeCount always set; summary omits the diff', () => {
    const log = {
      id: '1',
      entityType: 'User',
      entityId: 'u1',
      tableName: 'users',
      module: 'iam',
      action: 'Update',
      changes: [{ field: 'firstName', oldValue: 'a', newValue: 'b' }],
      ipAddress: null,
      userId: null,
      userName: null,
      createdAt: new Date('2026-01-01T00:00:00Z'),
    } as unknown as AuditLog

    const full = toAuditLogDto(log)
    expect(full.changeCount).toBe(1)
    expect(full.changes).toHaveLength(1)
    expect(full.createdAt).toBe('2026-01-01T00:00:00.000Z')

    const summary = toAuditLogDto(log, false)
    expect(summary.changeCount).toBe(1)
    expect(summary.changes).toHaveLength(0)
  })

  it('toErrorLogDto: maps dates to ISO and preserves fields', () => {
    const log = {
      id: 'e1',
      hash: 'h',
      origin: 'server',
      module: 'iam',
      message: 'boom',
      exceptionType: 'TypeError',
      stackTrace: null,
      source: null,
      fileName: null,
      lineNumber: null,
      httpMethod: null,
      path: null,
      queryString: null,
      statusCode: 500,
      ipAddress: null,
      userAgent: null,
      headers: null,
      userId: null,
      userName: null,
      status: 'new',
      developerNotes: null,
      occurrenceCount: 2,
      firstSeenAt: new Date('2026-01-01T00:00:00Z'),
      lastSeenAt: new Date('2026-01-02T00:00:00Z'),
    } as unknown as ErrorLog

    const dto = toErrorLogDto(log)
    expect(dto.occurrenceCount).toBe(2)
    expect(dto.status).toBe('new')
    expect(dto.firstSeenAt).toBe('2026-01-01T00:00:00.000Z')
    expect(dto.lastSeenAt).toBe('2026-01-02T00:00:00.000Z')
  })
})
