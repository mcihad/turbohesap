// Permission key for the components gallery module (frontend-only). Single source
// of truth, imported by the backend catalog (to seed it) and the frontend
// (to gate the module's nav + pages).
export const ComponentsPermissions = {
  read: 'components.read',
} as const

export type ComponentsPermission =
  (typeof ComponentsPermissions)[keyof typeof ComponentsPermissions]
