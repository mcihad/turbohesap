// Auth context — identical surface to the web app (`frontend/src/lib/auth/
// auth-context.ts`) so screens use the SAME permission/role API: hasPermission,
// hasAnyPermission, hasAllPermissions, hasRole, hasAnyRole, hasAllRoles.

import * as React from 'react'

import type { AuthTokens, CurrentUser } from '../tokens'

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

export interface AuthState {
  status: AuthStatus
  tokens: AuthTokens | null
  user: CurrentUser | null
  roles: string[]
  permissions: string[]
  hasRole: (role: string) => boolean
  hasAnyRole: (roles: string[]) => boolean
  hasAllRoles: (roles: string[]) => boolean
  hasPermission: (permission: string) => boolean
  hasAnyPermission: (permissions: string[]) => boolean
  hasAllPermissions: (permissions: string[]) => boolean
  /** Local login with username + password. Throws on failure. */
  login: (username: string, password: string) => Promise<void>
  /** POS terminal login with username + PIN. Throws on failure. */
  posLogin: (username: string, pin: string) => Promise<void>
  /** Fast cashier switch mid-shift by PIN. */
  posSwitch: (pin: string) => Promise<void>
  /** Clear the session (revokes the refresh token best-effort). */
  logout: () => Promise<void>
  /** Refresh the access token. Returns true on success. */
  refresh: () => Promise<boolean>
}

export const AuthContext = React.createContext<AuthState | null>(null)

export function useAuth(): AuthState {
  const ctx = React.useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>')
  return ctx
}
