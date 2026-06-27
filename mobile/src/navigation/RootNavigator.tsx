// RootNavigator — the top-level switch: a splash while the persisted session
// resolves, the login screen when unauthenticated, and the app shell once
// signed in. The mobile counterpart of the web's `_authed` route guard.

import * as React from 'react'
import { ActivityIndicator, View } from 'react-native'

import { useAuth } from '../lib/auth/auth-context'
import { LoginScreen } from '../screens/LoginScreen'
import { useTheme } from '../theme/theme-context'
import { AppShell } from './AppShell'

export function RootNavigator() {
  const { status } = useAuth()
  const t = useTheme()

  if (status === 'loading') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: t.colors.background }}>
        <ActivityIndicator size="large" color={t.colors.primary} />
      </View>
    )
  }

  if (status === 'unauthenticated') return <LoginScreen />

  return <AppShell />
}
