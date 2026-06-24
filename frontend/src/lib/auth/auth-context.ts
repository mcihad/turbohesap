import * as React from 'react'

import type { AuthTokens, CurrentUser } from './tokens'

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

export interface AuthState {
  status: AuthStatus
  tokens: AuthTokens | null
  user: CurrentUser | null
  roles: string[]
  permissions: string[]
  hasRole: (role: string) => boolean
  /** True if the user has at least one of the given roles. */
  hasAnyRole: (roles: string[]) => boolean
  /** True if the user has all of the given roles. */
  hasAllRoles: (roles: string[]) => boolean
  hasPermission: (permission: string) => boolean
  /** True if the user has at least one of the given permissions. */
  hasAnyPermission: (permissions: string[]) => boolean
  /** True if the user has all of the given permissions. */
  hasAllPermissions: (permissions: string[]) => boolean
  /** Local login with username + password. Throws on failure. */
  login: (username: string, password: string) => Promise<void>
  /** Clear the session (revokes the refresh token best-effort). */
  logout: () => Promise<void>
  /** Refresh the access token. Returns true on success. */
  refresh: () => Promise<boolean>
  /** Drop the session locally; the route guard sends the user to /login. */
  expire: () => void
}

export const AuthContext = React.createContext<AuthState | null>(null)

export function useAuth(): AuthState {
  const ctx = React.useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>')
  return ctx
}
