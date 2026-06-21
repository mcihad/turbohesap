import { createContext } from 'react'

import type { ThemeConfig, ThemeMode } from './types'

export interface ThemeContextValue {
  /** Full persisted config. */
  config: ThemeConfig
  /** Requested mode (light/dark/system). */
  mode: ThemeMode
  /** Mode actually applied right now (system resolved to light/dark). */
  resolvedMode: 'light' | 'dark'
  /** Patch one or more config fields and persist. */
  setConfig: (patch: Partial<ThemeConfig>) => void
  /** Convenience: set mode. */
  setMode: (mode: ThemeMode) => void
  /** Toggle between light and dark (ignores system). */
  toggleMode: () => void
  /** Reset everything to DEFAULT_THEME. */
  reset: () => void
}

export const ThemeContext = createContext<ThemeContextValue | null>(null)
