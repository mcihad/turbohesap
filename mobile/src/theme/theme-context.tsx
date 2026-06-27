// Theme engine for the mobile app — the RN counterpart of the web theme provider
// (DESIGN.md §5). It resolves a light/dark scheme (explicit or following the OS),
// lets the user pick a brand accent, corner roundness and base font size, and
// persists the whole config in AsyncStorage. Every component reads the active
// token set from one place.

import AsyncStorage from '@react-native-async-storage/async-storage'
import * as React from 'react'
import { Appearance } from 'react-native'

import {
  accentPreset,
  type ColorScheme,
  type ColorTokens,
  DEFAULT_ACCENT,
  duration,
  elevation,
  type FontScaleId,
  palettes,
  type RadiusScaleId,
  type RadiusTokens,
  scaleRadius,
  scaleType,
  spacing,
  type TypeTokens,
} from './tokens'

export type ThemeMode = 'light' | 'dark' | 'system'

export interface Theme {
  /** The actually-applied scheme (system resolved). */
  scheme: ColorScheme
  /** Active semantic colour set (neutral surfaces + the chosen accent). */
  colors: ColorTokens
  spacing: typeof spacing
  radius: RadiusTokens
  type: TypeTokens
  duration: typeof duration
  /** Elevation helper bound to the active scheme. */
  elevation: (level: 'none' | 'sm' | 'md' | 'lg' | 'xl') => object
}

export interface ThemeConfig {
  mode: ThemeMode
  /** Accent preset id (see ACCENT_PRESETS). */
  accent: string
  radiusScale: RadiusScaleId
  fontScale: FontScaleId
}

const DEFAULT_CONFIG: ThemeConfig = {
  mode: 'system',
  accent: DEFAULT_ACCENT,
  radiusScale: 'default',
  fontScale: 'default',
}

interface ThemeState {
  theme: Theme
  /** The user's full appearance config. */
  config: ThemeConfig
  /** The user's mode preference ('system' follows the OS). */
  mode: ThemeMode
  setMode: (mode: ThemeMode) => void
  setAccent: (accent: string) => void
  setRadiusScale: (scale: RadiusScaleId) => void
  setFontScale: (scale: FontScaleId) => void
  /** Restore every appearance setting to its default. */
  reset: () => void
  /** Quick light⇄dark flip (sets an explicit mode). */
  toggle: () => void
}

const STORAGE_KEY = 'turbohesap-theme'
const LEGACY_MODE_KEY = 'turbohesap-theme-mode'

const ThemeContext = React.createContext<ThemeState | null>(null)

function buildTheme(scheme: ColorScheme, config: ThemeConfig): Theme {
  const preset = accentPreset(config.accent)
  return {
    scheme,
    // Neutral palette + the preset's brand colours layered on top.
    colors: { ...palettes[scheme], ...preset[scheme] },
    spacing,
    radius: scaleRadius(config.radiusScale),
    type: scaleType(config.fontScale),
    duration,
    elevation: (level) => elevation(level, scheme),
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfigState] = React.useState<ThemeConfig>(DEFAULT_CONFIG)
  const [systemScheme, setSystemScheme] = React.useState<ColorScheme>(
    Appearance.getColorScheme() === 'dark' ? 'dark' : 'light',
  )

  // Restore the saved preference once on mount (with migration from the old
  // mode-only key).
  React.useEffect(() => {
    void (async () => {
      const raw = await AsyncStorage.getItem(STORAGE_KEY)
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as Partial<ThemeConfig>
          setConfigState({ ...DEFAULT_CONFIG, ...parsed })
          return
        } catch {
          // fall through to legacy / default
        }
      }
      const legacyMode = await AsyncStorage.getItem(LEGACY_MODE_KEY)
      if (legacyMode === 'light' || legacyMode === 'dark' || legacyMode === 'system') {
        setConfigState({ ...DEFAULT_CONFIG, mode: legacyMode })
      }
    })()
  }, [])

  // Follow OS appearance changes (only matters while mode === 'system').
  React.useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemScheme(colorScheme === 'dark' ? 'dark' : 'light')
    })
    return () => sub.remove()
  }, [])

  const persist = React.useCallback((next: ThemeConfig) => {
    setConfigState(next)
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }, [])

  const update = React.useCallback(
    (patch: Partial<ThemeConfig>) => {
      setConfigState((prev) => {
        const next = { ...prev, ...patch }
        void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next))
        return next
      })
    },
    [],
  )

  const scheme: ColorScheme = config.mode === 'system' ? systemScheme : config.mode
  const theme = React.useMemo(() => buildTheme(scheme, config), [scheme, config])

  const value = React.useMemo<ThemeState>(
    () => ({
      theme,
      config,
      mode: config.mode,
      setMode: (mode) => update({ mode }),
      setAccent: (accent) => update({ accent }),
      setRadiusScale: (radiusScale) => update({ radiusScale }),
      setFontScale: (fontScale) => update({ fontScale }),
      reset: () => persist(DEFAULT_CONFIG),
      toggle: () => update({ mode: scheme === 'dark' ? 'light' : 'dark' }),
    }),
    [theme, config, scheme, update, persist],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): Theme {
  const ctx = React.useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within <ThemeProvider>')
  return ctx.theme
}

/** Full theme controls (mode + accent + scales) — for the profile/settings screen. */
export function useThemeControls(): ThemeState {
  const ctx = React.useContext(ThemeContext)
  if (!ctx) throw new Error('useThemeControls must be used within <ThemeProvider>')
  return ctx
}
