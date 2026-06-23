// Thin client for the backend's /api/auth/* endpoints. The browser never talks
// to Keycloak's token endpoint directly — the backend (which holds the client
// secret) does that. These are same-origin calls.

import type { AuthTokens } from './tokens'

const AUTH_BASE = '/api/auth'

/** Full-page redirect URL that starts the Keycloak login. */
export function loginUrl(redirect = '/dashboard'): string {
  return `${AUTH_BASE}/login?redirect=${encodeURIComponent(redirect)}`
}

interface CallbackResponse extends AuthTokens {
  redirect: string
}

/** Exchange the authorization code (+ state) for tokens. */
export async function exchangeCode(
  code: string,
  state: string,
): Promise<CallbackResponse> {
  const res = await fetch(`${AUTH_BASE}/callback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, state }),
  })
  if (!res.ok) throw new Error(`callback failed: ${res.status}`)
  return (await res.json()) as CallbackResponse
}

/** Swap a refresh token for a fresh token set. */
export async function refreshTokens(refreshToken: string): Promise<AuthTokens> {
  const res = await fetch(`${AUTH_BASE}/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  })
  if (!res.ok) throw new Error(`refresh failed: ${res.status}`)
  return (await res.json()) as AuthTokens
}

/** Ask the backend for the Keycloak end-session URL (best effort). */
export async function requestLogout(
  idToken: string,
  refreshToken: string,
): Promise<string> {
  try {
    const res = await fetch(`${AUTH_BASE}/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken, refreshToken }),
    })
    const data = (await res.json()) as { logoutUrl?: string }
    return data.logoutUrl ?? '/login'
  } catch {
    return '/login'
  }
}
