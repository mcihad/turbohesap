// SessionWatcher — the mobile counterpart of the web session guard. While
// authenticated it polls the access-token expiry; ~30s before it lapses it shows
// an elegant modal with a live countdown and an "Oturumu uzat" button that
// refreshes the token. If the countdown reaches zero unattended, the session is
// cleared (logout) and RootNavigator drops the user back to the login screen.

import * as React from 'react'
import { Modal, View } from 'react-native'

import { Button, Icon, Text } from '../../components'
import { useTheme } from '../../theme/theme-context'
import { useAuth } from './auth-context'
import { accessExpiryMs } from '../tokens'

const WARN_BEFORE_MS = 30_000
const POLL_MS = 1_000

export function SessionWatcher() {
  const t = useTheme()
  const { status, tokens, refresh, logout } = useAuth()
  const [remaining, setRemaining] = React.useState<number | null>(null)
  const [busy, setBusy] = React.useState(false)

  const extend = React.useCallback(async () => {
    setBusy(true)
    const ok = await refresh()
    setBusy(false)
    if (ok) setRemaining(null)
    else void logout()
  }, [refresh, logout])

  React.useEffect(() => {
    if (status !== 'authenticated' || !tokens) {
      setRemaining(null)
      return
    }
    const exp = accessExpiryMs(tokens)
    if (!exp) return

    const tick = () => {
      const left = exp - Date.now()
      if (left <= 0) {
        setRemaining(null)
        void logout()
        return
      }
      setRemaining(left <= WARN_BEFORE_MS ? left : null)
    }

    tick()
    const interval = setInterval(tick, POLL_MS)
    return () => clearInterval(interval)
  }, [status, tokens, logout])

  if (remaining == null) return null

  const seconds = Math.ceil(remaining / 1000)
  const pct = Math.max(0, Math.min(100, (remaining / WARN_BEFORE_MS) * 100))
  const urgent = remaining <= 10_000
  const accent = urgent ? t.colors.destructive : t.colors.primary

  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => void extend()}>
      <View
        style={{
          flex: 1,
          backgroundColor: t.colors.overlay,
          alignItems: 'center',
          justifyContent: 'center',
          padding: t.spacing[6],
        }}
      >
        <View
          style={{
            width: '100%',
            maxWidth: 380,
            backgroundColor: t.colors.card,
            borderRadius: t.radius['2xl'],
            overflow: 'hidden',
            ...t.elevation('xl'),
          }}
        >
          <View style={{ flexDirection: 'row', gap: t.spacing[3], padding: t.spacing[5] }}>
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: accent + '1A', // ~10% tint
              }}
            >
              <Icon name="clock" size={22} color={accent} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="title" weight="semibold">
                Oturumunuz sona eriyor
              </Text>
              <Text variant="label" tone="muted">
                Güvenlik için{' '}
                <Text variant="label" weight="semibold" tone={urgent ? 'destructive' : 'default'}>
                  {seconds} sn
                </Text>{' '}
                içinde çıkış yapılacak.
              </Text>
            </View>
          </View>

          {/* depleting progress bar */}
          <View style={{ height: 4, backgroundColor: t.colors.muted }}>
            <View style={{ height: 4, width: `${pct}%`, backgroundColor: accent }} />
          </View>

          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'flex-end',
              gap: t.spacing[2],
              padding: t.spacing[4],
            }}
          >
            <Button title="Çıkış yap" variant="ghost" size="sm" disabled={busy} onPress={() => void logout()} />
            <Button
              title={busy ? 'Uzatılıyor…' : 'Oturumu uzat'}
              icon="shield"
              size="sm"
              loading={busy}
              disabled={busy}
              onPress={() => void extend()}
            />
          </View>
        </View>
      </View>
    </Modal>
  )
}
