// The single API instance for the web app, built from @turbohesap/shared. Every
// backend call (auth, iam users/roles/permissions, …) goes through here, so the
// contract is identical to what the React Native app uses — only the config
// (token source, base URL) differs per platform.

import { createTurbohesapApi } from '@turbohesap/shared'

import { loadTokens } from './auth/tokens'

// Same-origin: the NestJS backend serves both the API (/api) and this SPA.
const baseUrl = import.meta.env.VITE_API_BASE_URL ?? '/api'

export const api = createTurbohesapApi({
  baseUrl,
  // Attach the current access token (if any) to each request. The AuthProvider
  // refreshes proactively, so we just read the latest stored token here.
  getAccessToken: () => loadTokens()?.accessToken ?? null,
})
