import type { NavGroup, NavItem } from '@/config/navigation'
import type { AppModule } from '@/modules/types'

export type Can = (permission: string) => boolean

// Prune nav items the user cannot access (item.permission set and not granted).
// Branches whose children all disappear (and that aren't links themselves) are
// dropped too. Used by the sidebar, module rail and command palette.
function filterItems(items: NavItem[], can: Can): NavItem[] {
  const out: NavItem[] = []
  for (const item of items) {
    if (item.permission && !can(item.permission)) continue
    if (item.children) {
      const kids = filterItems(item.children, can)
      if (kids.length === 0 && !item.to) continue
      out.push({ ...item, children: kids })
    } else {
      out.push(item)
    }
  }
  return out
}

/** Return the nav with permission-gated items/groups removed. */
export function filterNavByPermission(nav: NavGroup[], can: Can): NavGroup[] {
  return nav
    .map((g) => ({ ...g, items: filterItems(g.items, can) }))
    .filter((g) => g.items.length > 0)
}

// Every permission key required by a module's *gated* nav items (recursing into
// children). Permission-less items (e.g. "Gösterge Paneli") contribute nothing.
function collectGatedPermissions(items: NavItem[]): string[] {
  const out: string[] = []
  for (const item of items) {
    if (item.permission) out.push(item.permission)
    if (item.children) out.push(...collectGatedPermissions(item.children))
  }
  return out
}

/** Distinct permission keys that gate any of a module's nav items. */
export function modulePermissionKeys(module: AppModule): string[] {
  return [...new Set(module.nav.flatMap((g) => collectGatedPermissions(g.items)))]
}

/**
 * Whether the user may enter a module. A module with no permission-gated items
 * (a pure overview like `genel`) is always open; otherwise the user must hold at
 * least one of its gated permissions. The permission-less dashboard item never
 * grants access on its own.
 */
export function moduleHasAccess(module: AppModule, can: Can): boolean {
  const keys = modulePermissionKeys(module)
  return keys.length === 0 || keys.some((k) => can(k))
}

/** Modules the user can see — those they have access to (see moduleHasAccess). */
export function accessibleModules(modules: AppModule[], can: Can): AppModule[] {
  return modules.filter((m) => moduleHasAccess(m, can))
}
