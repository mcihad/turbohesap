// App entry — composes the providers and renders the navigator. Mirrors the
// web's provider stack (theme → auth → app), adapted for React Native:
//   SafeAreaProvider → ThemeProvider → AuthProvider → RootNavigator
// All API access flows through @turbohesap/shared (src/lib/api.ts), so this app
// speaks the exact same contracts — and uses the same permission keys — as the
// web frontend. See mobile_design.md for the design system.

import { StatusBar } from 'expo-status-bar'
import * as React from 'react'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { AuthProvider } from './src/lib/auth/auth-provider'
import { RootNavigator } from './src/navigation/RootNavigator'
import { ThemeProvider, useTheme } from './src/theme/theme-context'

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <ThemedStatusBar />
          <RootNavigator />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  )
}

// Status bar icons follow the active scheme (dark icons on light, vice-versa).
function ThemedStatusBar() {
  const theme = useTheme()
  return <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
}
