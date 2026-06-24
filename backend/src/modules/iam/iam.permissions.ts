import type { PermissionDef } from '../../common/permission.types'

// Permissions declared by the IAM module. Every module owns a file like this and
// contributes it to the central catalog (src/permissions.catalog.ts), which is
// seeded on startup. Add a new permission here when the module needs one — it is
// auto-inserted on the next boot.
export const IAM_PERMISSIONS: PermissionDef[] = [
  { key: 'iam.users.read', description: 'Kullanıcıları görüntüleme', group: 'users' },
  { key: 'iam.users.write', description: 'Kullanıcı ekleme, düzenleme ve silme', group: 'users' },
  { key: 'iam.roles.read', description: 'Rolleri görüntüleme', group: 'roles' },
  { key: 'iam.roles.write', description: 'Rol ekleme, düzenleme ve silme', group: 'roles' },
  { key: 'iam.permissions.read', description: 'İzin kataloğunu görüntüleme', group: 'permissions' },
]
