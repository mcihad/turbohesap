import * as React from 'react'

import { loginUrl, refreshTokens, requestLogout } from './api'
import { AuthContext, type AuthState, type AuthStatus } from './auth-context'
import {
  type AuthTokens,
  clearTokens,
  isAccessExpired,
  loadTokens,
  rolesFromTokens,
  saveTokens,
  userFromTokens,
} from './tokens'

function initialStatus(): AuthStatus {
  const t = loadTokens()
  if (!t) return 'unauthenticated'
  // Expired access token but a stored session → resolve via refresh on mount.
  return isAccessExpired(t) ? 'loading' : 'authenticated'
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Initialise synchronously from storage so a reload keeps the session and we
  // avoid a setState-in-effect on first paint.
  const [tokens, setTokens] = React.useState<AuthTokens | null>(loadTokens)
  const [status, setStatus] = React.useState<AuthStatus>(initialStatus)

  // Latest tokens, readable from timers/callbacks without stale closures.
  const tokensRef = React.useRef<AuthTokens | null>(tokens)
  const apply = React.useCallback((next: AuthTokens | null) => {
    tokensRef.current = next
    setTokens(next)
  }, [])

  const setSession = React.useCallback(
    (next: AuthTokens) => {
      saveTokens(next)
      apply(next)
      setStatus('authenticated')
    },
    [apply],
  )

  const refresh = React.useCallback(async (): Promise<boolean> => {
    const current = tokensRef.current
    if (!current?.refreshToken) {
      clearTokens()
      apply(null)
      setStatus('unauthenticated')
      return false
    }
    try {
      const next = await refreshTokens(current.refreshToken)
      setSession(next)
      return true
    } catch {
      clearTokens()
      apply(null)
      setStatus('unauthenticated')
      return false
    }
  }, [apply, setSession])

  const expire = React.useCallback(() => {
    clearTokens()
    apply(null)
    setStatus('unauthenticated')
  }, [apply])

  const login = React.useCallback((redirect = '/dashboard') => {
    window.location.assign(loginUrl(redirect))
  }, [])

  const logout = React.useCallback(async () => {
    const current = tokensRef.current
    clearTokens()
    apply(null)
    setStatus('unauthenticated')
    const url = current
      ? await requestLogout(current.idToken, current.refreshToken)
      : '/login'
    window.location.assign(url)
  }, [apply])

  // If we started in `loading` (stale access token), resolve it once on mount.
  React.useEffect(() => {
    if (status === 'loading') void refresh()
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const roles = React.useMemo(
    () => (tokens ? rolesFromTokens(tokens) : []),
    [tokens],
  )
  const user = React.useMemo(
    () => (tokens ? userFromTokens(tokens) : null),
    [tokens],
  )

  const value = React.useMemo<AuthState>(
    () => ({
      status,
      tokens,
      user,
      roles,
      hasRole: (role) => roles.includes(role),
      hasAnyRole: (req) => req.some((r) => roles.includes(r)),
      hasAllRoles: (req) => req.every((r) => roles.includes(r)),
      login,
      logout,
      setSession,
      refresh,
      expire,
    }),
    [status, tokens, user, roles, login, logout, setSession, refresh, expire],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
