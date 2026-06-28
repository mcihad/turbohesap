import * as React from 'react'

import { api } from '@/lib/api'
import { AuthContext, type AuthState, type AuthStatus } from './auth-context'
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
} from './tokens'

function initialStatus(): AuthStatus {
  const t = loadTokens()
  if (!t) return 'unauthenticated'
  // Expired access token but a stored session → resolve via refresh on mount.
  return isAccessExpired(t) ? 'loading' : 'authenticated'
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [tokens, setTokens] = React.useState<AuthTokens | null>(loadTokens)
  const [user, setUser] = React.useState<CurrentUser | null>(loadUser)
  // Permissions are fetched from /api/auth/permissions (not in the token).
  const [permissions, setPermissions] = React.useState<string[]>(loadPermissions)
  const [status, setStatus] = React.useState<AuthStatus>(initialStatus)

  // Latest tokens, readable from timers/callbacks without stale closures.
  const tokensRef = React.useRef<AuthTokens | null>(tokens)
  const applyTokens = React.useCallback((next: AuthTokens | null) => {
    tokensRef.current = next
    setTokens(next)
  }, [])

  const clear = React.useCallback(() => {
    clearSession()
    applyTokens(null)
    setUser(null)
    setPermissions([])
    setStatus('unauthenticated')
  }, [applyTokens])

  // Pull the permission list for the signed-in user (best effort).
  const loadPerms = React.useCallback(async () => {
    try {
      const perms = await api.auth.permissions()
      savePermissions(perms)
      setPermissions(perms)
    } catch {
      savePermissions([])
      setPermissions([])
    }
  }, [])

  const login = React.useCallback(
    async (username: string, password: string) => {
      const res = await api.auth.login(username, password)
      const { user: u, ...t } = res
      saveTokens(t)
      saveUser(u)
      applyTokens(t)
      setUser(u)
      setStatus('authenticated')
      // Fetch permissions separately (token carries roles only).
      await loadPerms()
    },
    [applyTokens, loadPerms],
  )

  // POS terminal login (username + PIN). Stores the session exactly like a
  // normal login so refresh/permissions/SessionWatcher all keep working.
  const posLogin = React.useCallback(
    async (username: string, pin: string) => {
      const res = await api.auth.posLogin({ username, pin })
      const { user: u, ...t } = res
      saveTokens(t)
      saveUser(u)
      applyTokens(t)
      setUser(u)
      setStatus('authenticated')
      await loadPerms()
    },
    [applyTokens, loadPerms],
  )

  // Swap the active cashier without re-entering the username (PIN only).
  const posSwitch = React.useCallback(
    async (pin: string) => {
      const res = await api.auth.posSwitch({ pin })
      const { user: u, ...t } = res
      saveTokens(t)
      saveUser(u)
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
      clear()
      return false
    }
    try {
      const next = await api.auth.refresh(current.refreshToken)
      saveTokens(next)
      applyTokens(next)
      // Pull fresh identity + permissions so role changes take effect.
      const me = await api.auth.me()
      saveUser(me)
      setUser(me)
      await loadPerms()
      setStatus('authenticated')
      return true
    } catch {
      clear()
      return false
    }
  }, [applyTokens, clear, loadPerms])

  const expire = React.useCallback(() => clear(), [clear])

  const logout = React.useCallback(async () => {
    const current = tokensRef.current
    if (current?.refreshToken) {
      try {
        await api.auth.logout(current.refreshToken)
      } catch {
        /* best effort */
      }
    }
    clear()
  }, [clear])

  // On mount: if the stored access token is stale, resolve via refresh; if it's
  // valid but we have no cached permissions, fetch them once.
  React.useEffect(() => {
    void (async () => {
      if (status === 'loading') {
        await refresh()
      } else if (status === 'authenticated' && permissions.length === 0) {
        await loadPerms()
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
      posLogin,
      posSwitch,
      logout,
      refresh,
      expire,
    }),
    [status, tokens, user, roles, permissions, login, posLogin, posSwitch, logout, refresh, expire],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
