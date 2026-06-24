// Token storage for the mobile app — the React Native counterpart of the web's
// localStorage-backed tokens. The shape (AuthTokens) comes from @turbohesap/shared,
// so the web app, the backend, and this app all agree.

import AsyncStorage from '@react-native-async-storage/async-storage'
import type { AuthTokens } from '@turbohesap/shared'

const STORAGE_KEY = 'kentos-auth'

export async function loadTokens(): Promise<AuthTokens | null> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY)
  return raw ? (JSON.parse(raw) as AuthTokens) : null
}

export async function saveTokens(tokens: AuthTokens): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(tokens))
}

export async function clearTokens(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY)
}
