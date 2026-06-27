// The single API instance for the mobile app, built from @turbohesap/shared —
// the exact same contracts the web frontend uses. Only the platform wiring
// differs: an absolute base URL (no same-origin on a device) and an
// AsyncStorage-backed token source.

import Constants from 'expo-constants'

import { createTurbohesapApi } from '@turbohesap/shared'

import { loadTokens } from './tokens'

const API_PORT = 5800
// Fail fast on an unreachable host instead of hanging the UI forever.
const TIMEOUT_MS = 15000

// In development the JS bundle is served by Metro on YOUR machine; Expo exposes
// its host (your LAN address) so a physical phone can reach the backend there
// too — with zero per-network config. Empty in a standalone/production build,
// where the explicit env override is used instead.
function devServerHost(): string | null {
  const c = Constants as unknown as {
    expoConfig?: { hostUri?: string }
    expoGoConfig?: { debuggerHost?: string }
    manifest2?: { extra?: { expoGo?: { debuggerHost?: string } } }
  }
  const hostUri =
    c.expoConfig?.hostUri ??
    c.expoGoConfig?.debuggerHost ??
    c.manifest2?.extra?.expoGo?.debuggerHost
  const host = hostUri?.split('/')[0]?.split(':')[0]
  if (host && host !== 'localhost' && host !== '127.0.0.1') return host
  return null
}

function resolveBaseUrl(): string {
  // 1. Explicit override always wins — set EXPO_PUBLIC_API_BASE_URL for standalone
  //    builds (no dev server to derive a host from).
  const override = process.env.EXPO_PUBLIC_API_BASE_URL
  if (override) return override
  // 2. Dev: target the machine running Metro (= the backend) over the LAN.
  const host = devServerHost()
  if (host) return `http://${host}:${API_PORT}/api`
  // 3. Simulator / web fallback (localhost maps to the host there).
  return `http://localhost:${API_PORT}/api`
}

const baseUrl = resolveBaseUrl()

if (__DEV__) {
  // Surfaced in the Metro logs so the resolved address is easy to verify.
  console.log('[turbohesap] API base URL →', baseUrl)
}

export const api = createTurbohesapApi({
  baseUrl,
  timeout: TIMEOUT_MS,
  getAccessToken: async () => (await loadTokens())?.accessToken ?? null,
})
