// Permission keys for the Lookups (reference-data) module — SINGLE SOURCE OF
// TRUTH. `read` lets a user see/select lookup values (used by LookupSelect and
// the management screen); `write` lets them add/edit/delete items (the inline
// "+" on the select, and the management CRUD).
//
// `codePrefixesRead` covers list/get/peek/consume — generating a code (e.g.
// picking a stok kodu prefix) is a routine action for anyone filling out a
// form, not an admin task. `codePrefixesWrite` gates CRUD of the prefix
// DEFINITIONS themselves (context/prefix/padding/incrementOnSave) — that is
// admin-only.
export const LookupsPermissions = {
  read: 'lookups.read',
  write: 'lookups.write',
  codePrefixesRead: 'lookups.codePrefixes.read',
  codePrefixesWrite: 'lookups.codePrefixes.write',
} as const

export type LookupsPermission =
  (typeof LookupsPermissions)[keyof typeof LookupsPermissions]
