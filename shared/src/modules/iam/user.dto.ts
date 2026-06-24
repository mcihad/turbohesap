import type { RoleDto } from './role.dto'

// Full user record returned by the IAM users API.
export interface UserDto {
  id: string
  username: string
  email: string
  firstName: string
  lastName: string
  isActive: boolean
  roles: RoleDto[]
  lastLoginAt: string | null
  createdAt: string
  updatedAt: string
}

// The authenticated caller (from GET /api/auth/me) — identity + roles. The access
// token carries roles (not permissions, to keep it small); the permission list is
// fetched separately via IAuthService.permissions() (GET /api/auth/permissions).
export interface CurrentUser {
  id: string
  username: string
  email: string
  firstName: string
  lastName: string
  roles: string[]
}

export interface CreateUserRequest {
  username: string
  email: string
  password: string
  firstName?: string
  lastName?: string
  isActive?: boolean
  roleIds?: string[]
}

export interface UpdateUserRequest {
  email?: string
  password?: string
  firstName?: string
  lastName?: string
  isActive?: boolean
  roleIds?: string[]
}
