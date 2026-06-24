import type { PermissionDto } from './permission.dto'

// Contract for the IAM permission catalog (/api/iam/permissions).
export interface IPermissionsService {
  list(): Promise<PermissionDto[]>
}
