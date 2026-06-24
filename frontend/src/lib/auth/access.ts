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

/** Modules the user can see — those with at least one visible nav item. */
export function accessibleModules(modules: AppModule[], can: Can): AppModule[] {
  return modules.filter((m) => filterNavByPermission(m.nav, can).length > 0)
}
