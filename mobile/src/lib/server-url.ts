// Server (API base URL) configuration for the mobile app.
//
// By default the app derives the backend address automatically (an explicit
// EXPO_PUBLIC_API_BASE_URL override, else the Metro dev-server host over the LAN,
// else localhost). A user can override it from the login screen — handy when the
// backend lives on a different machine/IP than Metro, or in a standalone build
// on a customer's own network. The override is persisted in AsyncStorage and, if
// unset, the automatic default is used.

import AsyncStorage from '@react-native-async-storage/async-storage'
import Constants from 'expo-constants'

const STORAGE_KEY = 'turbohesap-api-base-url'
const API_PORT = 5800

// In development the JS bundle is served by Metro on YOUR machine; Expo exposes
// its host (your LAN address) so a physical phone can reach the backend there
// too — with zero per-network config. Empty in a standalone/production build.
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

/** The automatically-derived API base URL (no user override applied). */
export function resolveDefaultBaseUrl(): string {
  const override = process.env.EXPO_PUBLIC_API_BASE_URL
  if (override) return override
  const host = devServerHost()
  if (host) return `http://${host}:${API_PORT}/api`
  return `http://localhost:${API_PORT}/api`
}

export const DEFAULT_BASE_URL = resolveDefaultBaseUrl()

/**
 * Normalize whatever the user typed into a usable API base URL. Forgiving:
 *   "192.168.1.50"            → "http://192.168.1.50:5800/api"
 *   "192.168.1.50:9000"       → "http://192.168.1.50:9000/api"
 *   "https://app.example.com" → "https://app.example.com/api"
 *   "http://1.2.3.4:5800/api" → unchanged
 * An empty string yields null (→ "use the default").
 */
export function normalizeServerUrl(raw: string): string | null {
  let s = raw.trim().replace(/\/+$/, '')
  if (!s) return null
  if (!/^https?:\/\//i.test(s)) s = `http://${s}`
  const afterScheme = s.replace(/^https?:\/\//i, '')
  const authority = afterScheme.split('/')[0]
  const hasPath = afterScheme.includes('/')
  const hasPort = /:[0-9]+$/.test(authority)
  // Bare http host without a port → assume the backend's default port.
  if (!hasPort && !hasPath && /^http:\/\//i.test(s)) s += `:${API_PORT}`
  if (!hasPath) s += '/api'
  return s
}

/** Load the persisted override (or null when none is set). */
export async function loadServerUrlOverride(): Promise<string | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY)
    return raw && raw.trim() ? raw : null
  } catch {
    return null
  }
}

/** Persist (or clear, when null) the override. */
export async function saveServerUrlOverride(url: string | null): Promise<void> {
  try {
    if (url) await AsyncStorage.setItem(STORAGE_KEY, url)
    else await AsyncStorage.removeItem(STORAGE_KEY)
  } catch {
    // best-effort; ignore storage failures
  }
}
