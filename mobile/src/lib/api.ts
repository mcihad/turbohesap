// The single API instance for the mobile app, built from @turbohesap/shared —
// the exact same contracts the web frontend uses. Only the platform wiring
// differs: an absolute base URL (no same-origin on a device) and an
// AsyncStorage-backed token source.

import { createTurbohesapApi } from '@turbohesap/shared'

import { loadTokens } from './tokens'
import { DEFAULT_BASE_URL, loadServerUrlOverride } from './server-url'

// Fail fast on an unreachable host instead of hanging the UI forever.
const TIMEOUT_MS = 15000

if (__DEV__) {
  // Surfaced in the Metro logs so the resolved address is easy to verify.
  console.log('[turbohesap] default API base URL →', DEFAULT_BASE_URL)
}

export const api = createTurbohesapApi({
  baseUrl: DEFAULT_BASE_URL,
  timeout: TIMEOUT_MS,
  getAccessToken: async () => (await loadTokens())?.accessToken ?? null,
})

// Point every request at a new base URL at runtime (the user can override the
// default from the login screen). Mutating the axios default is enough — every
// service client shares this one instance.
export function setApiBaseUrl(url: string): void {
  api.http.defaults.baseURL = url
  if (__DEV__) console.log('[turbohesap] API base URL →', url)
}

// Apply any persisted override as early as possible (well before the first
// request, which only fires when the user taps "Giriş Yap").
void loadServerUrlOverride().then((stored) => {
  if (stored) setApiBaseUrl(stored)
})
