// A role aggregates permissions (by key), belongs to a module, and is assigned
// to users.
export interface RoleDto {
  id: string
  name: string
  description: string
  /** The module this role belongs to (one of MODULE_KEYS). */
  module: string
  isSystem: boolean
  permissions: string[]
  createdAt: string
  updatedAt: string
}

export interface CreateRoleRequest {
  name: string
  module: string
  description?: string
  permissionKeys?: string[]
}

export interface UpdateRoleRequest {
  name?: string
  module?: string
  description?: string
  permissionKeys?: string[]
}
