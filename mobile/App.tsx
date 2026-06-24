import { StatusBar } from 'expo-status-bar'
import { useEffect, useState } from 'react'
import {
  Button,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'

import type { CurrentUser, HealthStatus } from '@turbohesap/shared'

import { api } from './src/lib/api'
import { clearTokens, loadTokens, saveTokens } from './src/lib/tokens'

// Minimal demo screen proving the mobile app talks to the backend through the
// SAME @turbohesap/shared contracts as the web frontend: a health check and a
// local username/password login. Replace with real navigation as the app grows.
export default function App() {
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('Admin123!')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.health.getHealth().then(setHealth).catch(() => setHealth(null))
    loadTokens().then((t) => {
      if (t) api.auth.me().then(setUser).catch(() => undefined)
    })
  }, [])

  async function signIn() {
    setError(null)
    try {
      const res = await api.auth.login(username, password)
      const { user: u, ...tokens } = res
      await saveTokens(tokens)
      setUser(u)
    } catch {
      setError('Giriş başarısız')
    }
  }

  async function signOut() {
    const t = await loadTokens()
    if (t) await api.auth.logout(t.refreshToken).catch(() => undefined)
    await clearTokens()
    setUser(null)
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>TurboHesap Mobile</Text>
      <Text style={styles.muted}>@turbohesap/shared · same contracts as web</Text>

      <Text style={styles.row}>
        API: {health ? health.status : 'unreachable'}
      </Text>

      {user ? (
        <View style={styles.block}>
          <Text style={styles.label}>Signed in as {user.username}</Text>
          <Text style={styles.muted}>roles: {user.roles.join(', ') || '—'}</Text>
          <Button title="Sign out" onPress={signOut} />
        </View>
      ) : (
        <View style={styles.block}>
          <TextInput
            style={styles.input}
            placeholder="username"
            autoCapitalize="none"
            value={username}
            onChangeText={setUsername}
          />
          <TextInput
            style={styles.input}
            placeholder="password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button title="Sign in" onPress={signIn} />
        </View>
      )}

      <StatusBar style="auto" />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: { fontSize: 22, fontWeight: '600' },
  muted: { color: '#666', marginTop: 4 },
  row: { marginTop: 16 },
  block: { marginTop: 20, width: '100%', maxWidth: 320, gap: 10 },
  label: { fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  error: { color: '#c00' },
})
