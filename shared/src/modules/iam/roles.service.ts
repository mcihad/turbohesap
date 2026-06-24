import type {
  CreateRoleRequest,
  RoleDto,
  UpdateRoleRequest,
} from './role.dto'

// Contract for the IAM roles resource (/api/iam/roles).
export interface IRolesService {
  list(): Promise<RoleDto[]>
  get(id: string): Promise<RoleDto>
  create(input: CreateRoleRequest): Promise<RoleDto>
  update(id: string, input: UpdateRoleRequest): Promise<RoleDto>
  remove(id: string): Promise<void>
}
