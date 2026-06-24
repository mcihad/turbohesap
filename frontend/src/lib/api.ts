// The single API instance for the web app, built from @kentos/shared. Every
// backend call goes through here (auth, me, metadata, health), so the contract
// is identical to what the future React Native app will use — only the config
// (token source, base URL) differs per platform.

import { createKentosApi } from '@kentos/shared'

import { loadTokens } from './auth/tokens'

// Same-origin: the NestJS backend serves both the API (/api) and this SPA.
const baseUrl = import.meta.env.VITE_API_BASE_URL ?? '/api'
const moduleName = import.meta.env.VITE_MODULE_NAME ?? 'kentos-project-template'

export const api = createKentosApi({
  baseUrl,
  moduleName,
  // Attach the current access token (if any) to each request. The AuthProvider
  // refreshes proactively, so we just read the latest stored token here.
  getAccessToken: () => loadTokens()?.accessToken ?? null,
})
