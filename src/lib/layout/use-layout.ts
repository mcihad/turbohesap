import { useContext } from 'react'

import { LayoutContext } from './layout-context'

/** Access app-shell UI state (sidebar, launchers, AI dock). */
export function useLayout() {
  const ctx = useContext(LayoutContext)
  if (!ctx) {
    throw new Error('useLayout must be used within an AppShell')
  }
  return ctx
}
