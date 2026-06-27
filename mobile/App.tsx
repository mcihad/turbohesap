// App entry — composes the providers and renders the navigator. Mirrors the
// web's provider stack (theme → auth → app), adapted for React Native:
//   SafeAreaProvider → ThemeProvider → AuthProvider → RootNavigator
// All API access flows through @turbohesap/shared (src/lib/api.ts), so this app
// speaks the exact same contracts — and uses the same permission keys — as the
// web frontend. See mobile_design.md for the design system.

import { Feather } from '@expo/vector-icons'
import { useFonts } from 'expo-font'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import * as React from 'react'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { AuthProvider } from './src/lib/auth/auth-provider'
import { RootNavigator } from './src/navigation/RootNavigator'
import { ThemeProvider, useTheme } from './src/theme/theme-context'

// Keep the native splash up until the Feather icon font is ready. On Android the
// vector-icon font loads asynchronously, so without this the first-painted screen
// (the module launcher) renders its icons blank — they only appear after a later
// re-render. Preloading the font fixes that across the whole app.
void SplashScreen.preventAutoHideAsync()

export default function App() {
  const [fontsLoaded] = useFonts(Feather.font)

  React.useEffect(() => {
    if (fontsLoaded) void SplashScreen.hideAsync()
  }, [fontsLoaded])

  if (!fontsLoaded) return null

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
