// Bottom sheet to send an outbound message across a channel (email/Telegram/
// WhatsApp/SMS), optionally logged as an Activity on a contact/opportunity. An
// "AI taslağı" button drafts the body via Claude. Mirrors the web SendMessage
// dialog; slide-up Modal with a drag handle (same pattern as CloseOpportunitySheet).

import * as React from 'react'
import { Alert, Modal, Pressable, ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { type MessageChannel } from '@turbohesap/shared'

import { Button, FormSelect, FormTextArea, Icon, Input, Text } from '../../components'
import { api } from '../../lib/api'
import { useSubmit } from '../../lib/use-submit'
import { useTheme } from '../../theme/theme-context'

const CHANNEL_OPTIONS: { value: MessageChannel; label: string }[] = [
  { value: 'email', label: 'E-posta' },
  { value: 'telegram', label: 'Telegram' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'sms', label: 'SMS' },
]

const TO_PLACEHOLDER: Record<MessageChannel, string> = {
  email: 'alici@ornek.com',
  telegram: 'Chat ID',
  whatsapp: '+90...',
  sms: '+90...',
}

export interface SendMessageDefaults {
  channel?: MessageChannel
  to?: string
  subject?: string
  body?: string
}

export function SendMessageSheet({
  visible,
  contactId,
  opportunityId,
  defaults,
  onClose,
  onSent,
}: {
  visible: boolean
  contactId?: string | null
  opportunityId?: string | null
  defaults?: SendMessageDefaults
  onClose: () => void
  onSent?: () => void
}) {
  const t = useTheme()
  const insets = useSafeAreaInsets()
  const { submit, busy } = useSubmit()
  const draft = useSubmit()

  const [channel, setChannel] = React.useState<MessageChannel>('email')
  const [to, setTo] = React.useState('')
  const [subject, setSubject] = React.useState('')
  const [body, setBody] = React.useState('')

  React.useEffect(() => {
    if (!visible) return
    setChannel(defaults?.channel ?? 'email')
    setTo(defaults?.to ?? '')
    setSubject(defaults?.subject ?? '')
    setBody(defaults?.body ?? '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible])

  const aiDraft = () => {
    const prompt = body.trim() || subject.trim()
    if (!prompt) {
      Alert.alert('AI taslağı', 'Önce kısa bir bağlam veya konu yazın.')
      return
    }
    draft.submit(
      async () => {
        const res = await api.contacts.integrations.aiDraftEmail({ prompt, contactId })
        if (res.text?.trim()) setBody(res.text)
        else Alert.alert('Taslak boş döndü', 'Farklı bir model deneyin veya tekrar deneyin.')
      },
      { errorTitle: 'Taslak oluşturulamadı' },
    )
  }

  const send = () => {
    submit(
      () =>
        api.contacts.integrations
          .send({
            channel,
            to: to.trim(),
            subject: channel === 'email' ? subject.trim() || undefined : undefined,
            body,
            contactId,
            opportunityId,
          })
          .then(() => undefined),
      { onSuccess: onSent, errorTitle: 'Gönderilemedi' },
    )
  }

  const canSend = to.trim().length > 0 && body.trim().length > 0

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
            maxHeight: '88%',
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
            <Text variant="title" weight="semibold">
              Mesaj gönder
            </Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Icon name="x" size={22} color={t.colors.mutedForeground} />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={{ paddingHorizontal: t.spacing[5], gap: t.spacing[4], paddingBottom: t.spacing[2] }}
            keyboardShouldPersistTaps="handled"
          >
            <FormSelect label="Kanal" value={channel} options={CHANNEL_OPTIONS} onChange={setChannel} />

            <Input
              label="Alıcı"
              value={to}
              onChangeText={setTo}
              placeholder={TO_PLACEHOLDER[channel]}
              keyboardType={channel === 'email' ? 'email-address' : 'default'}
              autoCapitalize="none"
              autoCorrect={false}
            />

            {channel === 'email' ? (
              <Input label="Konu" value={subject} onChangeText={setSubject} placeholder="E-posta konusu" />
            ) : null}

            <FormTextArea label="Mesaj" value={body} onChangeText={setBody} placeholder="Mesaj metni" rows={5} />

            <Button
              title="AI taslağı"
              icon="cpu"
              variant="outline"
              loading={draft.busy}
              onPress={aiDraft}
              fullWidth
            />

            <Button title="Gönder" icon="send" loading={busy} disabled={!canSend} onPress={send} fullWidth />
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  )
}
