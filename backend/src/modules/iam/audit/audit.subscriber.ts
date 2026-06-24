import { Injectable } from '@nestjs/common'
import {
  DataSource,
  type EntityMetadata,
  type EntitySubscriberInterface,
  type InsertEvent,
  type ObjectLiteral,
  type RemoveEvent,
  type UpdateEvent,
} from 'typeorm'

import type { AuditAction, AuditLogChange } from '@turbohesap/shared'

import { RequestContext } from '../../../common/context/request-context'
import { AuditLog } from '../entities/audit-log.entity'
import {
  IGNORED_AUDIT_ENTITIES,
  NOISE_AUDIT_FIELDS,
  REDACTED_AUDIT_FIELDS,
  moduleForEntity,
} from './audited-entities'

// Global TypeORM subscriber: records Insert/Update/Delete for tracked entities,
// writing one AuditLog row per change in the SAME transaction (event.manager).
// It self-registers on the DataSource and skips ignored entities (incl. AuditLog
// itself, preventing recursion).
@Injectable()
export class AuditSubscriber implements EntitySubscriberInterface {
  constructor(dataSource: DataSource) {
    dataSource.subscribers.push(this)
  }

  afterInsert(event: InsertEvent<ObjectLiteral>): void {
    void this.record(event.metadata, event.entity, 'Insert', event, undefined)
  }

  afterUpdate(event: UpdateEvent<ObjectLiteral>): void {
    void this.record(
      event.metadata,
      event.entity ?? event.databaseEntity,
      'Update',
      event,
      event,
    )
  }

  afterRemove(event: RemoveEvent<ObjectLiteral>): void {
    void this.record(
      event.metadata,
      event.entity ?? event.databaseEntity,
      'Delete',
      event,
      undefined,
    )
  }

  private async record(
    meta: EntityMetadata,
    entity: ObjectLiteral | undefined,
    action: AuditAction,
    event: InsertEvent<ObjectLiteral> | UpdateEvent<ObjectLiteral> | RemoveEvent<ObjectLiteral>,
    updateEvent: UpdateEvent<ObjectLiteral> | undefined,
  ): Promise<void> {
    if (IGNORED_AUDIT_ENTITIES.has(meta.name)) return
    if (!entity) return

    const changes =
      action === 'Update'
        ? this.diffUpdate(meta, updateEvent!)
        : this.snapshot(meta, entity, action)

    // Skip no-op updates and updates that only touch bookkeeping columns.
    if (action === 'Update') {
      if (changes.length === 0) return
      if (changes.every((c) => NOISE_AUDIT_FIELDS.has(c.field))) return
    }

    const ctx = RequestContext.get()
    const row: Partial<AuditLog> = {
      entityType: meta.name,
      entityId: this.primaryKey(meta, entity),
      tableName: meta.tableName,
      module: moduleForEntity(meta.name),
      action,
      changes,
      ipAddress: ctx?.ipAddress ?? null,
      userId: ctx?.userId ?? null,
      userName: ctx?.userName ?? null,
    }
    try {
      await event.manager.getRepository(AuditLog).save(row)
    } catch {
      // Auditing must never break the underlying business operation.
    }
  }

  // Update → only the columns that actually changed (old → new).
  private diffUpdate(
    meta: EntityMetadata,
    event: UpdateEvent<ObjectLiteral>,
  ): AuditLogChange[] {
    const out: AuditLogChange[] = []
    const before = event.databaseEntity as ObjectLiteral | undefined
    const after = event.entity as ObjectLiteral | undefined
    for (const col of event.updatedColumns ?? []) {
      const prop = col.propertyName
      const oldValue = before ? before[prop] : undefined
      const newValue = after ? after[prop] : undefined
      if (Object.is(oldValue, newValue)) continue
      out.push({
        field: prop,
        oldValue: this.clean(prop, oldValue),
        newValue: this.clean(prop, newValue),
      })
    }
    return out
  }

  // Insert/Delete → a snapshot of all (non-relation) columns, on the side that
  // exists (newValue for inserts, oldValue for deletes).
  private snapshot(
    meta: EntityMetadata,
    entity: ObjectLiteral,
    action: AuditAction,
  ): AuditLogChange[] {
    const out: AuditLogChange[] = []
    for (const col of meta.columns) {
      const prop = col.propertyName
      const value = entity[prop]
      if (value === undefined) continue
      const cleaned = this.clean(prop, value)
      out.push({
        field: prop,
        oldValue: action === 'Delete' ? cleaned : null,
        newValue: action === 'Delete' ? null : cleaned,
      })
    }
    return out
  }

  private clean(field: string, value: unknown): unknown {
    if (value == null) return value
    if (REDACTED_AUDIT_FIELDS.has(field)) return '***'
    if (value instanceof Date) return value.toISOString()
    return value
  }

  private primaryKey(meta: EntityMetadata, entity: ObjectLiteral): string | null {
    const vals = meta.primaryColumns
      .map((c) => entity[c.propertyName])
      .filter((v) => v != null)
    return vals.length ? vals.join('|') : null
  }
}
