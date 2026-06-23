import * as React from 'react'

import type { AuthTokens, UserInfo } from './tokens'

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

export interface AuthState {
  status: AuthStatus
  tokens: AuthTokens | null
  user: UserInfo | null
  roles: string[]
  hasRole: (role: string) => boolean
  /** True if the user has at least one of the given roles. */
  hasAnyRole: (roles: string[]) => boolean
  /** True if the user has all of the given roles. */
  hasAllRoles: (roles: string[]) => boolean
  /** Start a full Keycloak login (redirects the browser). */
  login: (redirect?: string) => void
  /** Clear the session and redirect to Keycloak end-session. */
  logout: () => Promise<void>
  /** Persist a freshly-obtained token set (used by the callback route). */
  setSession: (tokens: AuthTokens) => void
  /** Refresh the access token. Returns true on success. */
  refresh: () => Promise<boolean>
  /** Drop the session locally (no IdP round-trip); the guard sends to /login. */
  expire: () => void
}

export const AuthContext = React.createContext<AuthState | null>(null)

export function useAuth(): AuthState {
  const ctx = React.useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>')
  return ctx
}
