import { type LucideIcon } from 'lucide-react'

// Navigation types. The actual navigation now lives per-module in
// `src/modules/<module>/module.config.ts` (see `src/modules/registry.ts`); the
// sidebar renders the active module's nav.

/** A single navigation entry. Either a link (`to`) or a branch (`children`). */
export interface NavItem {
  title: string
  icon?: LucideIcon
  to?: string
  badge?: string
  children?: NavItem[]
  /** Keywords to widen search matching. */
  keywords?: string[]
  /**
   * Permission key required to see this item. When set and the user lacks it,
   * the item (and any module whose items all become hidden) is filtered out of
   * the sidebar, module rail and command palette.
   */
  permission?: string
}

/** Navigation is organized into labeled groups, each holding a tree of items. */
export interface NavGroup {
  label?: string
  /**
   * Icon for the group. Shown next to the label when expanded, and as the single
   * representative glyph (with a hover/click flyout of the items) when the sidebar
   * is collapsed. Only meaningful for labeled groups.
   */
  icon?: LucideIcon
  items: NavItem[]
}
