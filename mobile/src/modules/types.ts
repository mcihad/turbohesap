// Module model for the mobile app — the RN counterpart of the web's
// `frontend/src/modules/types.ts`. A module is a top-level destination (a bottom
// tab); it owns a permission-gated list of nav items, each pointing at a screen
// key. The permission keys are the SAME @turbohesap/shared constants the backend
// enforces, so visibility here mirrors real access.

import type { IconName } from '../components/Icon'

/** A navigable destination inside a module (rendered on the module home). */
export interface MobileNavItem {
  /** Screen key resolved by the screen registry (navigation/screens.ts). */
  key: string
  title: string
  icon: IconName
  description?: string
  /** Permission required to see + open this item (UX gate). */
  permission?: string
}

export interface MobileModule {
  /** Stable key — also the first path segment on the web (/<key>). */
  key: string
  /** Turkish label shown in the tab bar + module home header. */
  label: string
  /** Feather icon for the tab bar. */
  icon: IconName
  /** Screen key opened when the tab is selected (its root). */
  home: string
  /** Optional permission gating the whole module/tab. */
  permission?: string
  /** Sub-destinations → bottom tabs inside the module (permission-filtered). */
  items: MobileNavItem[]
  /**
   * Screen key for the module's **dashboard (Panel) tab**. When omitted, the
   * generic `ModuleDashboardScreen` is used (quick-links to the resources).
   * A module with its own rich dashboard (e.g. genel) sets this.
   */
  dashboardScreen?: string
}
