// Permission keys for the Sales module — the SINGLE SOURCE OF TRUTH for the
// strings. Backend (catalog + @RequirePermissions) and frontend (gating) both
// import these, so a rename is a compile error everywhere, not silent drift.
export const SalesPermissions = {
  channelsRead: 'sales.channels.read',
  channelsWrite: 'sales.channels.write',
} as const

export type SalesPermission =
  (typeof SalesPermissions)[keyof typeof SalesPermissions]
