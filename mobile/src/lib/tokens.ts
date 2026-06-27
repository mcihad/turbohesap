// Session storage for the mobile app — the React Native counterpart of the web's
// localStorage-backed tokens (`frontend/src/lib/auth/tokens.ts`). Tokens, the
// current user, and the separately-fetched permission list are persisted in
// AsyncStorage so a relaunch keeps the session. All shapes come from
// @turbohesap/shared, so the app, the backend and the web frontend agree.

import AsyncStorage from '@react-native-async-storage/async-storage'
import type { AuthTokens, CurrentUser } from '@turbohesap/shared'

export type { AuthTokens, CurrentUser }

const TOKENS_KEY = 'turbohesap-auth'
const USER_KEY = 'turbohesap-user'
// Permissions are fetched separately (GET /api/auth/permissions, not in the
// token) and cached here — exactly like the web app.
const PERMS_KEY = 'turbohesap-permissions'

// ── Tokens ──────────────────────────────────────────────────────────────────

export async function loadTokens(): Promise<AuthTokens | null> {
  const raw = await AsyncStorage.getItem(TOKENS_KEY)
  return raw ? (JSON.parse(raw) as AuthTokens) : null
}

export async function saveTokens(tokens: AuthTokens): Promise<void> {
  await AsyncStorage.setItem(TOKENS_KEY, JSON.stringify(tokens))
}

// ── User ────────────────────────────────────────────────────────────────────

export async function loadUser(): Promise<CurrentUser | null> {
  const raw = await AsyncStorage.getItem(USER_KEY)
  return raw ? (JSON.parse(raw) as CurrentUser) : null
}

export async function saveUser(user: CurrentUser): Promise<void> {
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(user))
}

// ── Permissions ───────────────────────────────────────────────────────────—─

export async function loadPermissions(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(PERMS_KEY)
  return raw ? (JSON.parse(raw) as string[]) : []
}

export async function savePermissions(permissions: string[]): Promise<void> {
  await AsyncStorage.setItem(PERMS_KEY, JSON.stringify(permissions))
}

export async function clearSession(): Promise<void> {
  await AsyncStorage.multiRemove([TOKENS_KEY, USER_KEY, PERMS_KEY])
}

// ── JWT helpers (display / expiry only — no signature verification) ────────────

/** Decode a JWT payload. RN has no `atob`, so we base64-decode manually. */
export function decodeJwt<T = Record<string, unknown>>(token: string): T | null {
  try {
    const payload = token.split('.')[1]
    const json = base64UrlDecode(payload)
    return JSON.parse(json) as T
  } catch {
    return null
  }
}

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

function base64UrlDecode(input: string): string {
  let str = input.replace(/-/g, '+').replace(/_/g, '/')
  while (str.length % 4) str += '='
  let bytes = ''
  let buffer = 0
  let bits = 0
  for (const ch of str) {
    if (ch === '=') break
    const idx = B64.indexOf(ch)
    if (idx === -1) continue
    buffer = (buffer << 6) | idx
    bits += 6
    if (bits >= 8) {
      bits -= 8
      bytes += String.fromCharCode((buffer >> bits) & 0xff)
    }
  }
  // Decode UTF-8 sequence from the raw byte string.
  try {
    return decodeURIComponent(
      bytes
        .split('')
        .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join(''),
    )
  } catch {
    return bytes
  }
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

/** Up-to-two-letter avatar initials. Accepts any identity-ish record. */
export function initials(user: { firstName?: string; lastName?: string; username: string }): string {
  const f = user.firstName?.[0] ?? ''
  const l = user.lastName?.[0] ?? ''
  const fromName = `${f}${l}`.trim()
  return (fromName || user.username.slice(0, 2)).toUpperCase()
}
