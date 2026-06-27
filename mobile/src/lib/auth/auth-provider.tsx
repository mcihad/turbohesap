// Auth provider — the RN counterpart of `frontend/src/lib/auth/auth-provider.tsx`.
// Same flow: login stores tokens + user, then fetches the permission list
// SEPARATELY via GET /api/auth/permissions (the token carries roles only). On
// launch, a stored-but-expired access token is resolved via refresh. All session
// state is persisted in AsyncStorage (see ../tokens).

import * as React from 'react'

import { api } from '../api'
import {
  type AuthTokens,
  type CurrentUser,
  clearSession,
  isAccessExpired,
  loadPermissions,
  loadTokens,
  loadUser,
  savePermissions,
  saveTokens,
  saveUser,
} from '../tokens'
import { AuthContext, type AuthState, type AuthStatus } from './auth-context'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = React.useState<AuthStatus>('loading')
  const [tokens, setTokens] = React.useState<AuthTokens | null>(null)
  const [user, setUser] = React.useState<CurrentUser | null>(null)
  const [permissions, setPermissions] = React.useState<string[]>([])

  // Latest tokens, readable from callbacks without stale closures.
  const tokensRef = React.useRef<AuthTokens | null>(null)
  const applyTokens = React.useCallback((next: AuthTokens | null) => {
    tokensRef.current = next
    setTokens(next)
  }, [])

  const clear = React.useCallback(async () => {
    await clearSession()
    applyTokens(null)
    setUser(null)
    setPermissions([])
    setStatus('unauthenticated')
  }, [applyTokens])

  // Pull the permission list for the signed-in user (best effort).
  const loadPerms = React.useCallback(async () => {
    try {
      const perms = await api.auth.permissions()
      await savePermissions(perms)
      setPermissions(perms)
    } catch {
      await savePermissions([])
      setPermissions([])
    }
  }, [])

  const login = React.useCallback(
    async (username: string, password: string) => {
      const res = await api.auth.login(username, password)
      const { user: u, ...t } = res
      await saveTokens(t)
      await saveUser(u)
      applyTokens(t)
      setUser(u)
      setStatus('authenticated')
      await loadPerms()
    },
    [applyTokens, loadPerms],
  )

  const refresh = React.useCallback(async (): Promise<boolean> => {
    const current = tokensRef.current
    if (!current?.refreshToken) {
      await clear()
      return false
    }
    try {
      const next = await api.auth.refresh(current.refreshToken)
      await saveTokens(next)
      applyTokens(next)
      // Pull fresh identity + permissions so role changes take effect.
      const me = await api.auth.me()
      await saveUser(me)
      setUser(me)
      await loadPerms()
      setStatus('authenticated')
      return true
    } catch {
      await clear()
      return false
    }
  }, [applyTokens, clear, loadPerms])

  const logout = React.useCallback(async () => {
    const current = tokensRef.current
    if (current?.refreshToken) {
      try {
        await api.auth.logout(current.refreshToken)
      } catch {
        /* best effort */
      }
    }
    await clear()
  }, [clear])

  // Bootstrap on mount: restore the persisted session, refreshing if the stored
  // access token has already expired.
  React.useEffect(() => {
    void (async () => {
      const [t, u, perms] = await Promise.all([
        loadTokens(),
        loadUser(),
        loadPermissions(),
      ])
      if (!t) {
        setStatus('unauthenticated')
        return
      }
      applyTokens(t)
      setUser(u)
      setPermissions(perms)
      if (isAccessExpired(t)) {
        await refresh()
      } else {
        setStatus('authenticated')
        if (perms.length === 0) await loadPerms()
      }
    })()
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const roles = React.useMemo(() => user?.roles ?? [], [user])

  const value = React.useMemo<AuthState>(
    () => ({
      status,
      tokens,
      user,
      roles,
      permissions,
      hasRole: (role) => roles.includes(role),
      hasAnyRole: (req) => req.some((r) => roles.includes(r)),
      hasAllRoles: (req) => req.every((r) => roles.includes(r)),
      hasPermission: (perm) => permissions.includes(perm),
      hasAnyPermission: (req) => req.some((p) => permissions.includes(p)),
      hasAllPermissions: (req) => req.every((p) => permissions.includes(p)),
      login,
      logout,
      refresh,
    }),
    [status, tokens, user, roles, permissions, login, logout, refresh],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
