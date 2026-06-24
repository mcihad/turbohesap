import type { CurrentUser, RoleDto, UserDto } from '@turbohesap/shared'

import type { Role } from './entities/role.entity'
import type { User } from './entities/user.entity'

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
