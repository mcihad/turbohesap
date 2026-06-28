// LoginScreen — local username/password sign-in (the mobile counterpart of the
// web `routes/login.tsx`). On success the AuthProvider stores the session and
// fetches permissions; RootNavigator then swaps to the app shell.

import * as React from 'react'
import { KeyboardAvoidingView, Platform, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Button, Input, Text } from '../components'
import { Icon } from '../components/Icon'
import { useAuth } from '../lib/auth/auth-context'
import { useTheme } from '../theme/theme-context'

export function LoginScreen() {
  const t = useTheme()
  const insets = useSafeAreaInsets()
  const { login, posLogin } = useAuth()
  const [mode, setMode] = React.useState<'password' | 'pin'>('password')
  const [username, setUsername] = React.useState('admin')
  const [password, setPassword] = React.useState('Admin123!')
  const [pin, setPin] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState(false)

  async function signIn() {
    if (busy) return
    setError(null)
    setBusy(true)
    try {
      if (mode === 'pin') await posLogin(username.trim(), pin)
      else await login(username.trim(), password)
    } catch {
      setError(
        mode === 'pin'
          ? 'POS girişi başarısız. Kullanıcı adı veya PIN hatalı.'
          : 'Giriş başarısız. Kullanıcı adı veya parola hatalı.',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: t.colors.background,
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
      }}
    >
      <KeyboardAvoidingView
        style={{ flex: 1, justifyContent: 'center', paddingHorizontal: t.spacing[6] }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Brand mark */}
        <View style={{ alignItems: 'center', gap: t.spacing[3], marginBottom: t.spacing[10] }}>
          <View
            style={[
              {
                width: 64,
                height: 64,
                borderRadius: t.radius['2xl'],
                backgroundColor: t.colors.primary,
                alignItems: 'center',
                justifyContent: 'center',
              },
              t.elevation('md'),
            ]}
          >
            <Icon name="box" size={32} color={t.colors.primaryForeground} />
          </View>
          <View style={{ alignItems: 'center', gap: t.spacing[1] }}>
            <Text variant="h1">TurboHesap</Text>
            <Text variant="label" tone="muted">
              Hesabınıza giriş yapın
            </Text>
          </View>
        </View>

        {/* Form */}
        <View style={{ gap: t.spacing[4] }}>
          <Input
            label="Kullanıcı adı"
            icon="user"
            autoCapitalize="none"
            autoCorrect={false}
            value={username}
            onChangeText={setUsername}
            placeholder="kullanıcı adınız"
          />
          {mode === 'pin' ? (
            <Input
              label="PIN"
              icon="hash"
              password
              keyboardType="number-pad"
              value={pin}
              onChangeText={setPin}
              placeholder="••••"
              onSubmitEditing={signIn}
              returnKeyType="go"
              error={error ?? undefined}
            />
          ) : (
            <Input
              label="Parola"
              icon="lock"
              password
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              onSubmitEditing={signIn}
              returnKeyType="go"
              error={error ?? undefined}
            />
          )}
          <Button
            title={mode === 'pin' ? 'POS Girişi' : 'Giriş yap'}
            size="lg"
            fullWidth
            loading={busy}
            onPress={signIn}
            style={{ marginTop: t.spacing[2] }}
          />
          <Button
            title={mode === 'pin' ? 'Parola ile giriş' : 'POS PIN ile giriş'}
            variant="ghost"
            fullWidth
            onPress={() => {
              setError(null)
              setMode((m) => (m === 'pin' ? 'password' : 'pin'))
            }}
          />
        </View>

        <Text variant="caption" tone="muted" style={{ textAlign: 'center', marginTop: t.spacing[8] }}>
          @turbohesap/shared · web ile aynı kontratlar
        </Text>
      </KeyboardAvoidingView>
    </View>
  )
}
