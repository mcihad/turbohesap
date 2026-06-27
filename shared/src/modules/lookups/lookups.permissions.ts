// Permission keys for the Lookups (reference-data) module — SINGLE SOURCE OF
// TRUTH. `read` lets a user see/select lookup values (used by LookupSelect and
// the management screen); `write` lets them add/edit/delete items (the inline
// "+" on the select, and the management CRUD).
export const LookupsPermissions = {
  read: 'lookups.read',
  write: 'lookups.write',
} as const

export type LookupsPermission =
  (typeof LookupsPermissions)[keyof typeof LookupsPermissions]
