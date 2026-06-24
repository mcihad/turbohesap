import type { PageQuery } from '../../core/pagination'

// A single field-level change recorded for an entity mutation.
export interface AuditLogChange {
  field: string
  oldValue: unknown
  newValue: unknown
}

export type AuditAction = 'Insert' | 'Update' | 'Delete'

// One audit entry: a change to a tracked entity, captured automatically at the
// data layer (see the backend AuditSubscriber). Reused on entity detail pages
// via the shared AuditTrail component.
export interface AuditLogDto {
  id: string
  /** Entity class name, e.g. "User". */
  entityType: string
  /** Primary key of the changed entity (as string), if known. */
  entityId: string | null
  /** Database table name. */
  tableName: string | null
  /** Owning app module key (e.g. "iam"), derived from the entity. */
  module: string | null
  action: AuditAction
  /**
   * Number of recorded field changes. Always present, so the list can show a
   * summary and decide expandability without shipping the full diff.
   */
  changeCount: number
  /**
   * Field-level diff. The list endpoint omits it (empty) to stay light — fetch
   * the single record (`get`) to load it lazily on expand. `forEntity` includes it.
   */
  changes: AuditLogChange[]
  ipAddress: string | null
  userId: string | null
  userName: string | null
  createdAt: string
}

// Filters for the audit log list. All optional; combine freely.
export interface AuditLogQuery extends PageQuery {
  entityType?: string
  entityId?: string
  module?: string
  action?: AuditAction
  userId?: string
  /** Free-text match across entity type/id, user name and the change payload. */
  search?: string
  /** ISO date-time lower bound (inclusive) on createdAt. */
  from?: string
  /** ISO date-time upper bound (inclusive) on createdAt. */
  to?: string
}
