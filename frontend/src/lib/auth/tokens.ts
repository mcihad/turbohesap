// Token storage + JWT helpers for the Keycloak login flow.
//
// Tokens are kept in localStorage (so a reload keeps the session). The backend
// is the only party that holds the client secret; here we just store the tokens
// it returns, read claims from them, and decide when to refresh.

// AuthTokens is defined once in @kentos/shared (the wire contract) and re-used
// here so the web app, the backend, and the mobile app agree on the shape.
import type { AuthTokens } from '@kentos/shared'

export type { AuthTokens }

const STORAGE_KEY = 'kentos-auth'

export interface UserInfo {
  sub: string
  name?: string
  preferredUsername?: string
  email?: string
}

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
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as AuthTokens) : null
  } catch {
    return null
  }
}

export function saveTokens(tokens: AuthTokens): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens))
}

export function clearTokens(): void {
  localStorage.removeItem(STORAGE_KEY)
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

/** Identity for display — read from the lightweight id token. */
export function userFromTokens(tokens: AuthTokens): UserInfo | null {
  const c = decodeJwt<{
    sub?: string
    name?: string
    preferred_username?: string
    email?: string
  }>(tokens.idToken)
  if (!c?.sub) return null
  return {
    sub: c.sub,
    name: c.name,
    preferredUsername: c.preferred_username,
    email: c.email,
  }
}

/** Realm-level roles from the access token. */
export function realmRolesOf(tokens: AuthTokens): string[] {
  const c = decodeJwt<{ realm_access?: { roles?: string[] } }>(tokens.accessToken)
  return c?.realm_access?.roles ?? []
}

export interface ClientRoles {
  clientId: string
  roles: string[]
}

/** Client (resource) roles from the access token, grouped by client. */
export function clientRolesOf(tokens: AuthTokens): ClientRoles[] {
  const c = decodeJwt<{
    resource_access?: Record<string, { roles?: string[] }>
  }>(tokens.accessToken)
  return Object.entries(c?.resource_access ?? {})
    .map(([clientId, v]) => ({ clientId, roles: v.roles ?? [] }))
    .filter((e) => e.roles.length > 0)
    .sort((a, b) => a.clientId.localeCompare(b.clientId))
}

/** The authorized party (azp) — i.e. this module's Keycloak client id. */
export function currentClientId(tokens: AuthTokens): string | undefined {
  return decodeJwt<{ azp?: string }>(tokens.accessToken)?.azp
}

/** Roles from the access token: realm roles + this client's roles. */
export function rolesFromTokens(tokens: AuthTokens): string[] {
  const c = decodeJwt<{
    azp?: string
    realm_access?: { roles?: string[] }
    resource_access?: Record<string, { roles?: string[] }>
  }>(tokens.accessToken)
  if (!c) return []
  const realm = c.realm_access?.roles ?? []
  const client = (c.azp && c.resource_access?.[c.azp]?.roles) || []
  return Array.from(new Set([...realm, ...client]))
}
