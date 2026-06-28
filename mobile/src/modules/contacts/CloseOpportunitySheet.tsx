// Bottom sheet to close (sonuçlandır) an opportunity as won/lost, capturing an
// optional reason. Mirrors the web CloseOpportunityDialog. Slide-up Modal with a
// drag handle (same pattern as the inventory MovementSheet / invoice sheet).

import * as React from 'react'
import { Modal, Pressable, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import type { OpportunityDto } from '@turbohesap/shared'

import { Button, FormTextArea, Icon, Text, withAlpha } from '../../components'
import { api } from '../../lib/api'
import { useSubmit } from '../../lib/use-submit'
import { useTheme } from '../../theme/theme-context'

export function CloseOpportunitySheet({
  visible,
  opportunity,
  onClose,
  onClosed,
}: {
  visible: boolean
  opportunity: OpportunityDto | null
  onClose: () => void
  onClosed: () => void
}) {
  const t = useTheme()
  const insets = useSafeAreaInsets()
  const { submit, busy } = useSubmit()

  const [result, setResult] = React.useState<'won' | 'lost'>('won')
  const [reason, setReason] = React.useState('')

  React.useEffect(() => {
    if (!visible) return
    setResult('won')
    setReason('')
  }, [visible])

  const save = () => {
    if (!opportunity) return
    submit(
      () =>
        api.contacts.opportunities
          .close(opportunity.id, { result, reason: reason.trim() || null })
          .then(() => undefined),
      { onSuccess: onClosed, errorTitle: 'İşlem başarısız' },
    )
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: t.colors.overlay, justifyContent: 'flex-end' }} onPress={onClose}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            backgroundColor: t.colors.background,
            borderTopLeftRadius: t.radius['2xl'],
            borderTopRightRadius: t.radius['2xl'],
            paddingTop: t.spacing[3],
            paddingBottom: insets.bottom + t.spacing[4],
          }}
        >
          <View style={{ alignItems: 'center', paddingBottom: t.spacing[2] }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: t.colors.border }} />
          </View>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: t.spacing[5],
              paddingBottom: t.spacing[3],
            }}
          >
            <View style={{ flex: 1 }}>
              <Text variant="title" weight="semibold">
                Fırsatı kapat
              </Text>
              {opportunity ? (
                <Text variant="caption" tone="muted" numberOfLines={1}>
                  {opportunity.name}
                </Text>
              ) : null}
            </View>
            <Pressable onPress={onClose} hitSlop={8}>
              <Icon name="x" size={22} color={t.colors.mutedForeground} />
            </Pressable>
          </View>

          <View style={{ paddingHorizontal: t.spacing[5], gap: t.spacing[4] }}>
            <View style={{ flexDirection: 'row', gap: t.spacing[3] }}>
              <ResultButton
                active={result === 'won'}
                color={t.colors.success}
                icon="check-circle"
                label="Kazanıldı"
                onPress={() => setResult('won')}
              />
              <ResultButton
                active={result === 'lost'}
                color={t.colors.destructive}
                icon="x-circle"
                label="Kaybedildi"
                onPress={() => setResult('lost')}
              />
            </View>

            <FormTextArea
              label={result === 'won' ? 'Kazanma nedeni (opsiyonel)' : 'Kaybetme nedeni (opsiyonel)'}
              value={reason}
              onChangeText={setReason}
              placeholder={result === 'won' ? 'Örn: Fiyat avantajı' : 'Örn: Bütçe yetersiz'}
              rows={2}
            />

            <Button
              title={result === 'won' ? 'Kazanıldı olarak kapat' : 'Kaybedildi olarak kapat'}
              icon="check"
              fullWidth
              loading={busy}
              disabled={!opportunity}
              variant={result === 'won' ? 'default' : 'destructive'}
              onPress={save}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

function ResultButton({
  active,
  color,
  icon,
  label,
  onPress,
}: {
  active: boolean
  color: string
  icon: 'check-circle' | 'x-circle'
  label: string
  onPress: () => void
}) {
  const t = useTheme()
  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1,
        alignItems: 'center',
        gap: t.spacing[1.5],
        paddingVertical: t.spacing[4],
        borderRadius: t.radius.xl,
        borderWidth: 2,
        borderColor: active ? color : t.colors.border,
        backgroundColor: active ? withAlpha(color, 0.1) : 'transparent',
      }}
    >
      <Icon name={icon} size={24} color={active ? color : t.colors.mutedForeground} />
      <Text variant="label" weight="medium" style={{ color: active ? color : t.colors.mutedForeground }}>
        {label}
      </Text>
    </Pressable>
  )
}
