import { StatusBar } from 'expo-status-bar'
import { useEffect, useState } from 'react'
import { Button, Linking, StyleSheet, Text, View } from 'react-native'

import type { HealthStatus, ModuleManifest } from '@kentos/shared'

import { api } from './src/lib/api'

// Minimal demo screen proving the mobile app talks to the backend through the
// SAME @kentos/shared contracts as the web frontend. Replace with real
// navigation/screens as the app grows.
export default function App() {
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [module, setModule] = useState<ModuleManifest | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.health
      .getHealth()
      .then(setHealth)
      .catch((e: unknown) => setError(String(e)))
    api.metadata
      .getMetadata()
      .then(setModule)
      .catch(() => {
        /* metadata is best-effort for the demo */
      })
  }, [])

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{module?.displayName ?? 'KentOS Mobile'}</Text>
      <Text style={styles.muted}>@kentos/shared · same contracts as web</Text>

      <View style={styles.row}>
        <Text style={styles.label}>API</Text>
        <Text>
          {health ? health.status : error ? 'unreachable' : 'loading…'}
        </Text>
      </View>

      <View style={styles.spacer} />

      <Button
        title="Sign in with Keycloak"
        onPress={() => Linking.openURL(api.auth.loginUrl('/'))}
      />

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
  muted: { color: '#666', marginTop: 4, marginBottom: 24 },
  row: { flexDirection: 'row', gap: 8 },
  label: { fontWeight: '600' },
  spacer: { height: 24 },
})
