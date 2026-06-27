import type {
  AuditLogChange,
  AuditLogDto,
  BranchSummary,
  CurrentUser,
  ErrorLogDto,
  RoleDto,
  UserDto,
} from '@turbohesap/shared'

import type { Branch } from '../org/entities/branch.entity'
import type { AuditLog } from './entities/audit-log.entity'
import type { ErrorLog } from './entities/error-log.entity'
import type { Role } from './entities/role.entity'
import type { User } from './entities/user.entity'

export function toBranchSummary(b: Branch): BranchSummary {
  return { id: b.id, code: b.code, name: b.name, city: b.city }
}

export function toRoleDto(role: Role): RoleDto {
  return {
    id: role.id,
    name: role.name,
    description: role.description,
    module: role.module,
    isSystem: role.isSystem,
    permissions: (role.permissions ?? []).map((p) => p.key).sort(),
    createdAt: role.createdAt.toISOString(),
    updatedAt: role.updatedAt.toISOString(),
  }
}

export function toUserDto(user: User): UserDto {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    isActive: user.isActive,
    roles: (user.roles ?? []).map(toRoleDto),
    branches: (user.branches ?? []).map(toBranchSummary),
    lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  }
}

/** Unique permission keys aggregated across all of the user's roles. */
export function permissionKeysOf(user: User): string[] {
  const keys = new Set<string>()
  for (const role of user.roles ?? []) {
    for (const p of role.permissions ?? []) keys.add(p.key)
  }
  return [...keys].sort()
}

export function toCurrentUser(user: User): CurrentUser {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    roles: (user.roles ?? []).map((r) => r.name).sort(),
  }
}

// `includeChanges=false` yields a light summary (changeCount only) for lists;
// the full diff is loaded lazily via get()/forEntity().
export function toAuditLogDto(
  log: AuditLog,
  includeChanges = true,
): AuditLogDto {
  const changes = (log.changes ?? []) as AuditLogChange[]
  return {
    id: log.id,
    entityType: log.entityType,
    entityId: log.entityId,
    tableName: log.tableName,
    module: log.module,
    action: log.action,
    changeCount: changes.length,
    changes: includeChanges ? changes : [],
    ipAddress: log.ipAddress,
    userId: log.userId,
    userName: log.userName,
    createdAt: log.createdAt.toISOString(),
  }
}

export function toErrorLogDto(log: ErrorLog): ErrorLogDto {
  return {
    id: log.id,
    hash: log.hash,
    origin: log.origin,
    module: log.module,
    message: log.message,
    exceptionType: log.exceptionType,
    stackTrace: log.stackTrace,
    source: log.source,
    fileName: log.fileName,
    lineNumber: log.lineNumber,
    httpMethod: log.httpMethod,
    path: log.path,
    queryString: log.queryString,
    statusCode: log.statusCode,
    ipAddress: log.ipAddress,
    userAgent: log.userAgent,
    headers: log.headers,
    userId: log.userId,
    userName: log.userName,
    status: log.status,
    developerNotes: log.developerNotes,
    occurrenceCount: log.occurrenceCount,
    firstSeenAt: log.firstSeenAt.toISOString(),
    lastSeenAt: log.lastSeenAt.toISOString(),
  }
}
