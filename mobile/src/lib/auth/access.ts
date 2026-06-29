// Permission-driven visibility helpers — the RN counterpart of the web's
// `frontend/src/lib/auth/access.ts`. Filters module nav items the user cannot
// access and drops modules left with nothing visible. Used by the tab bar and
// the module home list.

import type { MobileModule, MobileNavItem } from '../../modules/types'

export type Can = (permission: string) => boolean

/** Nav items the user is allowed to see (item.permission unset or granted). */
export function filterItems(items: MobileNavItem[], can: Can): MobileNavItem[] {
  return items.filter((item) => !item.permission || can(item.permission))
}

/** Modules with at least one visible item (and module.permission, if set). */
export function accessibleModules(modules: MobileModule[], can: Can): MobileModule[] {
  return modules.filter((m) => {
    if (m.permission && !can(m.permission)) return false
    // A module with its own dashboard (e.g. Genel) stays visible even when all
    // its permission-gated sub-items are filtered out — the dashboard is its
    // always-accessible landing page.
    if (m.dashboardScreen) return true
    return filterItems(m.items, can).length > 0 || m.items.length === 0
  })
}
