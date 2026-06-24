import { IamPermissions } from '@turbohesap/shared'

import type { PermissionDef } from '../../common/permission.types'

// Permission DEFINITIONS for the IAM module: the shared key (single source of
// truth, from @turbohesap/shared) + a Turkish description + UI group. Aggregated
// in src/permissions.catalog.ts and auto-seeded on boot.
export const IAM_PERMISSION_DEFS: PermissionDef[] = [
  { key: IamPermissions.usersRead, description: 'Kullanıcıları görüntüleme', group: 'users' },
  { key: IamPermissions.usersWrite, description: 'Kullanıcı ekleme, düzenleme ve silme', group: 'users' },
  { key: IamPermissions.rolesRead, description: 'Rolleri görüntüleme', group: 'roles' },
  { key: IamPermissions.rolesWrite, description: 'Rol ekleme, düzenleme ve silme', group: 'roles' },
  { key: IamPermissions.permissionsRead, description: 'İzin kataloğunu görüntüleme', group: 'permissions' },
  { key: IamPermissions.auditRead, description: 'Denetim kayıtlarını görüntüleme', group: 'audit' },
  { key: IamPermissions.errorsRead, description: 'Hata kayıtlarını görüntüleme', group: 'errors' },
  { key: IamPermissions.errorsWrite, description: 'Hata kaydı durumunu ve notlarını düzenleme', group: 'errors' },
  { key: IamPermissions.errorsDelete, description: 'Hata kayıtlarını silme', group: 'errors' },
]
