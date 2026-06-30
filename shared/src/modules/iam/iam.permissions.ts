// Permission keys for the IAM module — the SINGLE SOURCE OF TRUTH for the
// permission strings. The backend uses these in its catalog + @RequirePermissions,
// the frontend uses them for gating (hasPermission / <Can> / nav). Keeping them
// here (typed) means a rename is a compile error everywhere, not silent drift.
export const IamPermissions = {
  usersRead: 'iam.users.read',
  usersWrite: 'iam.users.write',
  /** Reset/renew another user's password (revokes their sessions). */
  usersPassword: 'iam.users.password',
  rolesRead: 'iam.roles.read',
  rolesWrite: 'iam.roles.write',
  permissionsRead: 'iam.permissions.read',
  auditRead: 'iam.audit.read',
  errorsRead: 'iam.errors.read',
  errorsWrite: 'iam.errors.write',
  errorsDelete: 'iam.errors.delete',
} as const

export type IamPermission = (typeof IamPermissions)[keyof typeof IamPermissions]
