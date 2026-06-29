// FeedbackHost — wraps the app shell content and mounts the global feedback flow:
//   • a floating button (gated by feedback.create) — only permitted users see it;
//   • on tap, snapshots the wrapped content via Skia makeImageFromView (the button
//     and sheet are siblings of the captured View, so they're excluded);
//   • a bottom-sheet form (category/title/note + screenshot preview → İşaretle);
//   • the AnnotationEditor; and submit (upload PNG + api.feedback.create).
//
// pageUrl is set to the active module/section key (the precise per-tab screen key
// lives inside ModuleShell's nav context and isn't reachable from this level).

import * as React from 'react'
import { Alert, Image, Modal, Pressable, ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { makeImageFromView, type SkImage } from '@shopify/react-native-skia'

import {
  FEEDBACK_TYPE_LABELS,
  FEEDBACK_TYPES,
  type FeedbackType,
  FeedbackPermissions,
} from '@turbohesap/shared'

import { api } from '../../lib/api'
import { usePermitted } from '../../lib/auth/can'
import { useSubmit } from '../../lib/use-submit'
import { useTheme } from '../../theme/theme-context'
import { Button } from '../Button'
import { FormSelect, FormTextArea } from '../form'
import { Icon } from '../Icon'
import { Input } from '../Input'
import { Text } from '../Text'
import { bakeAnnotated } from './annotate'
import { AnnotationEditor } from './AnnotationEditor'
import { uploadFeedbackScreenshot } from './upload'

const TYPE_OPTIONS = FEEDBACK_TYPES.map((v) => ({ value: v, label: FEEDBACK_TYPE_LABELS[v] }))

export function FeedbackHost({ pageKey, children }: { pageKey: string; children: React.ReactNode }) {
  const canCreate = usePermitted({ permission: FeedbackPermissions.create })
  const contentRef = React.useRef<View>(null)

  return (
    <View style={{ flex: 1 }}>
      <View ref={contentRef} collapsable={false} style={{ flex: 1 }}>
        {children}
      </View>
      {canCreate ? <FeedbackLauncher contentRef={contentRef} pageKey={pageKey} /> : null}
    </View>
  )
}

function FeedbackLauncher({
  contentRef,
  pageKey,
}: {
  contentRef: React.RefObject<View | null>
  pageKey: string
}) {
  const t = useTheme()
  const insets = useSafeAreaInsets()
  const { submit, busy } = useSubmit()

  const [open, setOpen] = React.useState(false)
  const [capturing, setCapturing] = React.useState(false)
  const [editorOpen, setEditorOpen] = React.useState(false)
  const [capture, setCapture] = React.useState<SkImage | null>(null)
  const [shotUri, setShotUri] = React.useState<string | null>(null)

  const [type, setType] = React.useState<FeedbackType>('request')
  const [title, setTitle] = React.useState('')
  const [message, setMessage] = React.useState('')

  const reset = () => {
    setOpen(false)
    setCapture(null)
    setShotUri(null)
    setType('request')
    setTitle('')
    setMessage('')
  }

  const launch = async () => {
    setCapturing(true)
    try {
      const img = await makeImageFromView(contentRef as React.RefObject<React.Component>)
      if (img) {
        setCapture(img)
        try {
          setShotUri(await bakeAnnotated(img, [], img.width(), img.height()))
        } catch {
          setShotUri(null)
        }
      }
    } catch {
      setCapture(null)
      setShotUri(null)
    } finally {
      setCapturing(false)
      setOpen(true)
    }
  }

  const onSubmit = () =>
    submit(
      async () => {
        let screenshotFileId: string | undefined
        if (shotUri) {
          const files = await uploadFeedbackScreenshot(shotUri)
          screenshotFileId = files[0]?.id
        }
        await api.feedback.create({
          type,
          title: title.trim() || undefined,
          message: message.trim(),
          pageUrl: pageKey,
          screenshotFileId,
        })
      },
      {
        onSuccess: () => {
          reset()
          Alert.alert('Teşekkürler', 'Geri bildiriminiz alındı.')
        },
        errorTitle: 'Gönderilemedi',
      },
    )

  return (
    <>
      {/* Floating button — sibling of the captured View, so it's not in the shot. */}
      <Pressable
        onPress={launch}
        disabled={capturing}
        accessibilityLabel="Geri bildirim gönder"
        style={[
          {
            position: 'absolute',
            right: t.spacing[4],
            bottom: insets.bottom + 72,
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: t.colors.primary,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: capturing ? 0.6 : 1,
          },
          t.elevation('lg'),
        ]}
      >
        <Icon name="message-circle" size={22} color={t.colors.primaryForeground} />
      </Pressable>

      {/* Bottom-sheet form */}
      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable
          onPress={() => setOpen(false)}
          style={{ flex: 1, backgroundColor: t.colors.overlay, justifyContent: 'flex-end' }}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: t.colors.background,
              borderTopLeftRadius: t.radius['2xl'],
              borderTopRightRadius: t.radius['2xl'],
              paddingTop: t.spacing[3],
              paddingBottom: insets.bottom + t.spacing[5],
              maxHeight: '90%',
            }}
          >
            <View style={{ alignItems: 'center', paddingBottom: t.spacing[2] }}>
              <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: t.colors.border }} />
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingHorizontal: t.spacing[5], gap: t.spacing[4] }}
            >
              <Text variant="title" weight="semibold">
                Geri bildirim
              </Text>

              {/* Screenshot preview + markup */}
              {shotUri ? (
                <View style={{ gap: t.spacing[2] }}>
                  <Image
                    source={{ uri: shotUri }}
                    resizeMode="contain"
                    style={{
                      width: '100%',
                      height: 200,
                      borderRadius: t.radius.lg,
                      borderWidth: 1,
                      borderColor: t.colors.border,
                      backgroundColor: t.colors.muted,
                    }}
                  />
                  <Button
                    title="İşaretle"
                    variant="outline"
                    icon="edit-2"
                    onPress={() => setEditorOpen(true)}
                  />
                </View>
              ) : (
                <Text variant="caption" tone="muted">
                  Ekran görüntüsü eklenmedi.
                </Text>
              )}

              <FormSelect<FeedbackType>
                label="Kategori"
                value={type}
                options={TYPE_OPTIONS}
                onChange={setType}
              />
              <Input label="Başlık" placeholder="Kısa bir başlık (opsiyonel)" value={title} onChangeText={setTitle} />
              <FormTextArea
                label="Notunuz"
                placeholder="Ne iletmek istersiniz?"
                value={message}
                onChangeText={setMessage}
                rows={4}
              />

              <Button
                title="Gönder"
                icon="send"
                fullWidth
                loading={busy}
                disabled={!message.trim()}
                onPress={onSubmit}
              />
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Annotation editor */}
      <AnnotationEditor
        visible={editorOpen}
        image={capture}
        onCancel={() => setEditorOpen(false)}
        onDone={(uri) => {
          setShotUri(uri)
          setEditorOpen(false)
        }}
      />
    </>
  )
}
