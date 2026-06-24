// Thin wrappers over the shared auth client (@kentos/shared). The browser never
// talks to Keycloak directly — the backend (which holds the client secret) does.
// These keep the original function-style API the auth provider/callback use,
// while the actual implementation lives in @kentos/shared so the mobile app can
// reuse it.

import type { AuthTokens, CallbackResponse } from '@kentos/shared'

import { api } from '@/lib/api'

/** Full-page redirect URL that starts the Keycloak login. */
export function loginUrl(redirect = '/dashboard'): string {
  return api.auth.loginUrl(redirect)
}

/** Exchange the authorization code (+ state) for tokens. */
export function exchangeCode(
  code: string,
  state: string,
): Promise<CallbackResponse> {
  return api.auth.exchangeCode(code, state)
}

/** Swap a refresh token for a fresh token set. */
export function refreshTokens(refreshToken: string): Promise<AuthTokens> {
  return api.auth.refresh(refreshToken)
}

/** Ask the backend for the Keycloak end-session URL (best effort). */
export function requestLogout(
  idToken: string,
  refreshToken: string,
): Promise<string> {
  return api.auth.logout(idToken, refreshToken)
}
