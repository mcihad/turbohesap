// The single API instance for the mobile app, built from @kentos/shared — the
// exact same contracts the web frontend uses. Only the platform wiring differs:
// an absolute base URL (no same-origin on a device) and an AsyncStorage-backed
// token source.

import { createKentosApi } from '@kentos/shared'

import { loadTokens } from './tokens'

// On a real device "localhost" is the phone, not your machine — point
// EXPO_PUBLIC_API_BASE_URL at the backend's LAN address (e.g.
// http://192.168.1.20:5800/api) in mobile/.env or your shell.
const baseUrl =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:5800/api'
const moduleName =
  process.env.EXPO_PUBLIC_MODULE_NAME ?? 'kentos-project-template'

export const api = createKentosApi({
  baseUrl,
  moduleName,
  getAccessToken: async () => (await loadTokens())?.accessToken ?? null,
})
