import * as React from 'react'

import { ThemeContext } from './theme-context'
import { DEFAULT_THEME } from './presets'
import { generateThemeCss } from './generate-css'
import type { ThemeConfig, ThemeMode } from './types'

const STORAGE_KEY = 'app-theme'
const STYLE_ID = 'app-theme'

function loadConfig(): ThemeConfig {
  if (typeof window === 'undefined') return DEFAULT_THEME
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_THEME
    // Merge so new fields added later still get defaults.
    return { ...DEFAULT_THEME, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_THEME
  }
}

function systemPrefersDark(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  )
}

function resolveMode(mode: ThemeMode): 'light' | 'dark' {
  if (mode === 'system') return systemPrefersDark() ? 'dark' : 'light'
  return mode
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfigState] = React.useState<ThemeConfig>(loadConfig)
  const [resolvedMode, setResolvedMode] = React.useState<'light' | 'dark'>(() =>
    resolveMode(loadConfig().mode),
  )

  // Inject the generated token stylesheet whenever the config changes.
  React.useLayoutEffect(() => {
    let style = document.getElementById(STYLE_ID) as HTMLStyleElement | null
    if (!style) {
      style = document.createElement('style')
      style.id = STYLE_ID
      document.head.appendChild(style)
    }
    style.textContent = generateThemeCss(config)
  }, [config])

  // Apply the dark class + keep resolvedMode in sync with mode / OS changes.
  React.useLayoutEffect(() => {
    const apply = () => {
      const resolved = resolveMode(config.mode)
      setResolvedMode(resolved)
      document.documentElement.classList.toggle('dark', resolved === 'dark')
      document.documentElement.style.colorScheme = resolved
    }
    apply()

    if (config.mode !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [config.mode])

  // Persist on every change.
  React.useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
    } catch {
      /* ignore quota / privacy-mode errors */
    }
  }, [config])

  const setConfig = React.useCallback((patch: Partial<ThemeConfig>) => {
    setConfigState((prev) => ({ ...prev, ...patch }))
  }, [])

  const setMode = React.useCallback(
    (mode: ThemeMode) => setConfig({ mode }),
    [setConfig],
  )

  const toggleMode = React.useCallback(() => {
    setConfigState((prev) => ({
      ...prev,
      mode: resolveMode(prev.mode) === 'dark' ? 'light' : 'dark',
    }))
  }, [])

  const reset = React.useCallback(() => setConfigState(DEFAULT_THEME), [])

  const value = React.useMemo(
    () => ({
      config,
      mode: config.mode,
      resolvedMode,
      setConfig,
      setMode,
      toggleMode,
      reset,
    }),
    [config, resolvedMode, setConfig, setMode, toggleMode, reset],
  )

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  )
}
