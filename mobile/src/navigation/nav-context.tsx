// Lightweight tab + stack navigator. Deliberately dependency-free (no
// react-navigation/expo-router native modules) so the app stays robust in the
// pnpm/Expo Go setup. Each tab keeps its own screen stack; the active tab's top
// screen is what AppShell renders. This models the web's module-rail → sidebar →
// page flow: switching tabs swaps the section, navigate() drills into a page.

import * as React from 'react'

export interface ScreenInstance {
  /** Screen key resolved by the screen registry. */
  key: string
  params?: Record<string, unknown>
  /** Optional title override (e.g. an entity name for the header). */
  title?: string
}

export interface TabInit {
  key: string
  home: ScreenInstance
}

interface NavState {
  tabs: string[]
  activeTab: string
  current: ScreenInstance
  canGoBack: boolean
  /** Switch tabs; tapping the already-active tab resets it to its root. */
  switchTab: (tab: string) => void
  /** Push a screen onto the active tab's stack. */
  navigate: (key: string, params?: Record<string, unknown>, title?: string) => void
  /** Pop the active tab's stack (no-op at the root). */
  goBack: () => void
  /** Update the current screen's title (e.g. once an entity name loads). */
  setTitle: (title: string) => void
}

const NavContext = React.createContext<NavState | null>(null)

export function NavigationProvider({
  tabs,
  initialTab,
  children,
}: {
  tabs: TabInit[]
  initialTab: string
  children: React.ReactNode
}) {
  const [activeTab, setActiveTab] = React.useState(initialTab)
  const [stacks, setStacks] = React.useState<Record<string, ScreenInstance[]>>(() =>
    Object.fromEntries(tabs.map((t) => [t.key, [t.home]])),
  )

  // If the accessible tab set changes (e.g. permissions load after login),
  // add/remove stacks without losing existing ones.
  React.useEffect(() => {
    setStacks((prev) => {
      const next: Record<string, ScreenInstance[]> = {}
      for (const t of tabs) next[t.key] = prev[t.key] ?? [t.home]
      return next
    })
    setActiveTab((cur) => (tabs.some((t) => t.key === cur) ? cur : initialTab))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabs.map((t) => t.key).join('|')])

  const homeFor = React.useCallback(
    (tab: string) => tabs.find((t) => t.key === tab)?.home ?? { key: tab },
    [tabs],
  )

  const switchTab = React.useCallback(
    (tab: string) => {
      setActiveTab((cur) => {
        if (cur === tab) {
          // Re-tapping the active tab pops it back to its root.
          setStacks((s) => ({ ...s, [tab]: [homeFor(tab)] }))
        }
        return tab
      })
    },
    [homeFor],
  )

  const navigate = React.useCallback(
    (key: string, params?: Record<string, unknown>, title?: string) => {
      setStacks((s) => ({
        ...s,
        [activeTab]: [...(s[activeTab] ?? []), { key, params, title }],
      }))
    },
    [activeTab],
  )

  const goBack = React.useCallback(() => {
    setStacks((s) => {
      const stack = s[activeTab] ?? []
      if (stack.length <= 1) return s
      return { ...s, [activeTab]: stack.slice(0, -1) }
    })
  }, [activeTab])

  const setTitle = React.useCallback(
    (title: string) => {
      setStacks((s) => {
        const stack = s[activeTab] ?? []
        if (stack.length === 0) return s
        const top = { ...stack[stack.length - 1], title }
        return { ...s, [activeTab]: [...stack.slice(0, -1), top] }
      })
    },
    [activeTab],
  )

  const stack = stacks[activeTab] ?? [homeFor(activeTab)]
  const current = stack[stack.length - 1]

  const value = React.useMemo<NavState>(
    () => ({
      tabs: tabs.map((t) => t.key),
      activeTab,
      current,
      canGoBack: stack.length > 1,
      switchTab,
      navigate,
      goBack,
      setTitle,
    }),
    [tabs, activeTab, current, stack.length, switchTab, navigate, goBack, setTitle],
  )

  return <NavContext.Provider value={value}>{children}</NavContext.Provider>
}

export function useNav(): NavState {
  const ctx = React.useContext(NavContext)
  if (!ctx) throw new Error('useNav must be used within <NavigationProvider>')
  return ctx
}
