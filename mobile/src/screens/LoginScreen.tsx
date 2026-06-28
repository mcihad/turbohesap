// LoginScreen — local username/password sign-in (the mobile counterpart of the
// web `routes/login.tsx`). On success the AuthProvider stores the session and
// fetches permissions; RootNavigator then swaps to the app shell.

import * as React from 'react'
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Button, Input, Text } from '../components'
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
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'center',
            paddingHorizontal: t.spacing[6],
            paddingVertical: t.spacing[4],
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Brand logo & heading */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: t.spacing[4],
              marginBottom: t.spacing[8],
            }}
          >
            <Image
              source={require('../../assets/logo.png')}
              style={{ width: 76, height: 76, borderRadius: t.radius.lg }}
              resizeMode="contain"
            />
            <View style={{ gap: 2 }}>
              <Text variant="h1" style={{ fontSize: 24, fontWeight: '700', lineHeight: 28 }}>
                TurboHesap
              </Text>
              <Text variant="caption" tone="muted">
                Hesabınıza giriş yapın
              </Text>
            </View>
          </View>

          {/* Tab mode switcher */}
          <View
            style={{
              flexDirection: 'row',
              borderBottomWidth: 1,
              borderBottomColor: t.colors.border,
              marginBottom: t.spacing[5],
            }}
          >
            <Pressable
              onPress={() => {
                setError(null)
                setMode('password')
              }}
              style={{
                flex: 1,
                paddingVertical: t.spacing[3],
                alignItems: 'center',
                borderBottomWidth: mode === 'password' ? 2 : 0,
                borderBottomColor: t.colors.primary,
              }}
            >
              <Text
                variant="label"
                weight={mode === 'password' ? 'semibold' : 'normal'}
                tone={mode === 'password' ? 'default' : 'muted'}
              >
                Yönetici Girişi
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setError(null)
                setMode('pin')
              }}
              style={{
                flex: 1,
                paddingVertical: t.spacing[3],
                alignItems: 'center',
                borderBottomWidth: mode === 'pin' ? 2 : 0,
                borderBottomColor: t.colors.primary,
              }}
            >
              <Text
                variant="label"
                weight={mode === 'pin' ? 'semibold' : 'normal'}
                tone={mode === 'pin' ? 'default' : 'muted'}
              >
                POS Terminal
              </Text>
            </Pressable>
          </View>

          {/* Form Fields */}
          <View style={{ gap: t.spacing[4] }}>
            <Input
              label="Kullanıcı Adı"
              icon="user"
              autoCapitalize="none"
              autoCorrect={false}
              value={username}
              onChangeText={setUsername}
              placeholder="kullanıcı adınız"
            />

            {mode === 'pin' ? (
              <Input
                label="PIN Kodu"
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
              title={mode === 'pin' ? 'POS Girişi Yap' : 'Giriş Yap'}
              size="lg"
              fullWidth
              loading={busy}
              onPress={signIn}
              style={{ marginTop: t.spacing[2] }}
            />
          </View>

          {/* Footer */}
          <Text variant="caption" tone="muted" style={{ textAlign: 'center', marginTop: t.spacing[10] }}>
            @turbohesap/shared · web ile aynı kontratlar
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}
