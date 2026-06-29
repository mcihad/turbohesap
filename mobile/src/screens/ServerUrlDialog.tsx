// A small, friendly dialog to point the app at a different backend server.
// Reached by double-tapping the logo on the login screen. Leaving it blank (or
// "Varsayılana dön") restores the automatic default.

import * as React from 'react'
import { Modal, Pressable, View } from 'react-native'

import { Button, Icon, Input, Text } from '../components'
import { setApiBaseUrl } from '../lib/api'
import {
  DEFAULT_BASE_URL,
  loadServerUrlOverride,
  normalizeServerUrl,
  saveServerUrlOverride,
} from '../lib/server-url'
import { useTheme } from '../theme/theme-context'

export function ServerUrlDialog({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const t = useTheme()
  const [value, setValue] = React.useState('')
  const [saving, setSaving] = React.useState(false)

  // Prefill with the current override each time it opens.
  React.useEffect(() => {
    if (!visible) return
    setValue('')
    loadServerUrlOverride().then((stored) => setValue(stored ?? ''))
  }, [visible])

  const preview = normalizeServerUrl(value)

  const apply = async (url: string | null) => {
    setSaving(true)
    try {
      await saveServerUrlOverride(url)
      setApiBaseUrl(url ?? DEFAULT_BASE_URL)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        style={{ flex: 1, backgroundColor: t.colors.overlay, alignItems: 'center', justifyContent: 'center', padding: t.spacing[6] }}
      >
        {/* Stop taps inside the card from dismissing. */}
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            width: '100%',
            maxWidth: 420,
            backgroundColor: t.colors.card,
            borderRadius: t.radius['2xl'],
            borderWidth: 1,
            borderColor: t.colors.border,
            padding: t.spacing[5],
            gap: t.spacing[4],
            shadowColor: '#000',
            shadowOpacity: 0.18,
            shadowRadius: 24,
            shadowOffset: { width: 0, height: 12 },
            elevation: 8,
          }}
        >
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing[3] }}>
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: t.radius.lg,
                backgroundColor: t.colors.primarySoft,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="server" size={22} color={t.colors.primary} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="title" weight="semibold">Sunucu adresi</Text>
              <Text variant="caption" tone="muted">
                Bağlanılacak sunucu IP/adresini ayarlayın.
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={8}>
              <Icon name="x" size={22} color={t.colors.mutedForeground} />
            </Pressable>
          </View>

          {/* Input */}
          <Input
            label="Sunucu adresi veya IP"
            icon="globe"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            value={value}
            onChangeText={setValue}
            placeholder="örn. 192.168.1.50 veya https://sunucu.com"
          />

          {/* Live preview + default hint */}
          <View
            style={{
              gap: 4,
              padding: t.spacing[3],
              borderRadius: t.radius.md,
              backgroundColor: t.colors.background,
              borderWidth: 1,
              borderColor: t.colors.border,
            }}
          >
            <Text variant="caption" tone="muted">
              Bağlanılacak adres:
            </Text>
            <Text variant="label" weight="medium" numberOfLines={1}>
              {preview ?? DEFAULT_BASE_URL}
              {preview ? '' : '  (varsayılan)'}
            </Text>
            <Text variant="caption" tone="muted" numberOfLines={1}>
              Varsayılan: {DEFAULT_BASE_URL}
            </Text>
          </View>

          {/* Actions */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing[2] }}>
            <Button
              title="Varsayılana dön"
              variant="ghost"
              size="sm"
              disabled={saving}
              onPress={() => apply(null)}
            />
            <View style={{ flex: 1 }} />
            <Button title="İptal" variant="outline" size="sm" disabled={saving} onPress={onClose} />
            <Button
              title="Kaydet"
              size="sm"
              loading={saving}
              onPress={() => apply(preview)}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}
