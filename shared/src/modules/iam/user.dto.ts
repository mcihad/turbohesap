import type { BranchSummary } from '../org/branch.dto'
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
  /** Branches this user is authorized for (org module). */
  branches: BranchSummary[]
  /** Telegram chat id for direct notifications/messages to this user. */
  telegramChatId: string | null
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
  /** IDs of branches the user is authorized for (org module). */
  branchIds?: string[]
  telegramChatId?: string | null
}

export interface UpdateUserRequest {
  email?: string
  password?: string
  firstName?: string
  lastName?: string
  isActive?: boolean
  roleIds?: string[]
  branchIds?: string[]
  telegramChatId?: string | null
}
