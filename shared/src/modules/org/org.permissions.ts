// Permission keys for the Organization module — SINGLE SOURCE OF TRUTH. Backend
// (catalog + @RequirePermissions) and frontend (gating) both import these.
export const OrgPermissions = {
  branchesRead: 'org.branches.read',
  branchesWrite: 'org.branches.write',
} as const

export type OrgPermission = (typeof OrgPermissions)[keyof typeof OrgPermissions]
