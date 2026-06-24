import type { Page } from '../../core/pagination'
import type { AuditLogDto, AuditLogQuery } from './audit-log.dto'

// Contract for the audit log resource (/api/iam/audit-logs). Read-only — audit
// entries are written automatically by the data layer, never via the API.
export interface IAuditLogsService {
  list(query?: AuditLogQuery): Promise<Page<AuditLogDto>>
  get(id: string): Promise<AuditLogDto>
  /** All entries for one entity, newest first — for entity detail pages. */
  forEntity(entityType: string, entityId: string): Promise<AuditLogDto[]>
}
