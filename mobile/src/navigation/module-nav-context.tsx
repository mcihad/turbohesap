// Module navigation context — the top-level "which module am I in" state, lifted
// in AppShell. `activeModuleKey` is null on the home launcher, '__profile__' for
// the profile, or a module key when inside a module (its resources become the
// bottom tabs). The home launcher and the in-module module-switcher both call
// `enterModule`.

import * as React from 'react'

import type { MobileModule } from '../modules/types'

export const PROFILE_KEY = '__profile__'

interface ModuleNavState {
  /** null = home launcher · PROFILE_KEY = profile · else a module key. */
  activeModuleKey: string | null
  /** Modules the user can access (permission-filtered). */
  modules: MobileModule[]
  /** Enter a module (or null for the home launcher, or PROFILE_KEY). */
  enterModule: (key: string | null) => void
}

const ModuleNavContext = React.createContext<ModuleNavState | null>(null)

export function ModuleNavProvider({
  value,
  children,
}: {
  value: ModuleNavState
  children: React.ReactNode
}) {
  return <ModuleNavContext.Provider value={value}>{children}</ModuleNavContext.Provider>
}

export function useModuleNav(): ModuleNavState {
  const ctx = React.useContext(ModuleNavContext)
  if (!ctx) throw new Error('useModuleNav must be used within <ModuleNavProvider>')
  return ctx
}
