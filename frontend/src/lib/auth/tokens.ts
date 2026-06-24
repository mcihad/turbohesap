// Local session storage + JWT helpers. Tokens and the current user are kept in
// localStorage so a reload keeps the session. The shapes (AuthTokens,
// CurrentUser) come from @turbohesap/shared so the whole stack agrees.

import type { AuthTokens, CurrentUser } from '@turbohesap/shared'

export type { AuthTokens, CurrentUser }

const TOKENS_KEY = 'turbohesap-auth'
const USER_KEY = 'turbohesap-user'
// Permissions are fetched separately (not carried in the token) and cached here.
const PERMS_KEY = 'turbohesap-permissions'

/** Decode a JWT payload without verifying the signature (display/expiry only). */
export function decodeJwt<T = Record<string, unknown>>(token: string): T | null {
  try {
    const part = token.split('.')[1]
    const b64 = part.replace(/-/g, '+').replace(/_/g, '/')
    const json = decodeURIComponent(
      atob(b64)
        .split('')
        .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join(''),
    )
    return JSON.parse(json) as T
  } catch {
    return null
  }
}

export function loadTokens(): AuthTokens | null {
  try {
    const raw = localStorage.getItem(TOKENS_KEY)
    return raw ? (JSON.parse(raw) as AuthTokens) : null
  } catch {
    return null
  }
}

export function saveTokens(tokens: AuthTokens): void {
  localStorage.setItem(TOKENS_KEY, JSON.stringify(tokens))
}

export function loadUser(): CurrentUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? (JSON.parse(raw) as CurrentUser) : null
  } catch {
    return null
  }
}

export function saveUser(user: CurrentUser): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function loadPermissions(): string[] {
  try {
    const raw = localStorage.getItem(PERMS_KEY)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}

export function savePermissions(permissions: string[]): void {
  localStorage.setItem(PERMS_KEY, JSON.stringify(permissions))
}

export function clearSession(): void {
  localStorage.removeItem(TOKENS_KEY)
  localStorage.removeItem(USER_KEY)
  localStorage.removeItem(PERMS_KEY)
}

/** Absolute expiry (ms epoch) of the access token, or 0 if unknown. */
export function accessExpiryMs(tokens: AuthTokens): number {
  const claims = decodeJwt<{ exp?: number }>(tokens.accessToken)
  return claims?.exp ? claims.exp * 1000 : 0
}

export function isAccessExpired(tokens: AuthTokens, skewMs = 0): boolean {
  const exp = accessExpiryMs(tokens)
  return exp === 0 || Date.now() + skewMs >= exp
}

/** Friendly display name for the current user. */
export function displayName(user: CurrentUser): string {
  const full = `${user.firstName} ${user.lastName}`.trim()
  return full || user.username
}
