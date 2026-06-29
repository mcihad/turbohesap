// FeedbackDetailScreen — read the screenshot + note + metadata, and (feedback.manage)
// change status/priority or delete. The screenshot is resolved through the files
// API: list('Feedback', id) → storedName → rawUrl (see the mobile feedback notes).

import * as React from 'react'
import { Image, View } from 'react-native'

import {
  FEEDBACK_PRIORITIES,
  FEEDBACK_STATUSES,
  type FeedbackPriority,
  type FeedbackStatus,
  FeedbackPermissions,
} from '@turbohesap/shared'

import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  FieldGrid,
  Screen,
  Section,
  Skeleton,
  Text,
} from '../../components'
import { FormSelect } from '../../components/form'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth/auth-context'
import { formatDateTime } from '../../lib/datetime'
import { useAsync } from '../../lib/use-async'
import { confirmDestructive, useSubmit } from '../../lib/use-submit'
import { useNav } from '../../navigation/nav-context'
import { useTheme } from '../../theme/theme-context'
import {
  feedbackPriorityLabel,
  feedbackStatusLabel,
  feedbackStatusTone,
  feedbackTypeLabel,
} from './labels'

export function FeedbackDetailScreen() {
  const t = useTheme()
  const nav = useNav()
  const { hasPermission } = useAuth()
  const canRead = hasPermission(FeedbackPermissions.read)
  const canManage = hasPermission(FeedbackPermissions.manage)
  const id = String(nav.current.params?.id ?? '')

  const feedback = useAsync(() => api.feedback.get(id), [id], { enabled: canRead && !!id })
  const shot = useAsync(
    async () => {
      const files = await api.files.list('Feedback', id)
      const stored = files[0]?.storedName
      return stored ? api.files.rawUrl(stored) : null
    },
    [id],
    { enabled: canRead && !!id },
  )
  const { submit, busy } = useSubmit()

  const f = feedback.data

  const update = (patch: { status?: FeedbackStatus; priority?: FeedbackPriority }) =>
    submit(
      async () => {
        await api.feedback.update(id, patch)
      },
      { onSuccess: feedback.refetch },
    )

  return (
    <PermissionWrap onBack={nav.goBack}>
      <Screen
        header={{
          title: f?.title?.trim() || 'Geri bildirim',
          subtitle: f ? feedbackTypeLabel(f.type) : undefined,
          onBack: nav.goBack,
        }}
        onRefresh={() => {
          feedback.refetch()
          shot.refetch()
        }}
        refreshing={feedback.refreshing}
      >
        {feedback.loading ? (
          <Card style={{ gap: t.spacing[3] }}>
            <Skeleton width="60%" height={18} />
            <Skeleton width="40%" height={13} />
          </Card>
        ) : feedback.error || !f ? (
          <EmptyState icon="alert-triangle" tone="destructive" title="Yüklenemedi" description={feedback.error ?? 'Kayıt bulunamadı.'} actionLabel="Tekrar dene" onAction={feedback.refetch} />
        ) : (
          <>
            <Section title="Durum">
              <Card style={{ gap: t.spacing[4] }}>
                <View style={{ flexDirection: 'row', gap: t.spacing[1.5] }}>
                  <Badge label={feedbackStatusLabel(f.status)} tone={feedbackStatusTone(f.status)} />
                  <Badge label={feedbackPriorityLabel(f.priority)} tone="muted" />
                </View>
                {canManage ? (
                  <View style={{ gap: t.spacing[3] }}>
                    <FormSelect<FeedbackStatus>
                      label="Durum"
                      value={f.status}
                      options={FEEDBACK_STATUSES.map((s) => ({ value: s, label: feedbackStatusLabel(s) }))}
                      onChange={(status) => update({ status })}
                    />
                    <FormSelect<FeedbackPriority>
                      label="Öncelik"
                      value={f.priority}
                      options={FEEDBACK_PRIORITIES.map((p) => ({ value: p, label: feedbackPriorityLabel(p) }))}
                      onChange={(priority) => update({ priority })}
                    />
                  </View>
                ) : null}
              </Card>
            </Section>

            <Section title="Not">
              <Card>
                {f.title?.trim() ? (
                  <Text variant="title" weight="semibold" style={{ marginBottom: t.spacing[2] }}>
                    {f.title}
                  </Text>
                ) : null}
                <Text variant="body">{f.message}</Text>
              </Card>
            </Section>

            {shot.data ? (
              <Section title="Ekran görüntüsü">
                <Card>
                  <Image
                    source={{ uri: shot.data }}
                    resizeMode="contain"
                    style={{ width: '100%', height: 280, borderRadius: t.radius.md, backgroundColor: t.colors.muted }}
                  />
                </Card>
              </Section>
            ) : null}

            <Section title="Bilgiler">
              <Card>
                <FieldGrid>
                  <Field label="Tür" value={feedbackTypeLabel(f.type)} />
                  <Field label="Gönderen" value={f.createdByName} />
                  <Field label="Sayfa" value={f.pageUrl || '—'} />
                  <Field label="Oluşturma" value={formatDateTime(f.createdAt)} />
                  <Field label="Güncelleme" value={formatDateTime(f.updatedAt)} />
                </FieldGrid>
              </Card>
            </Section>

            {canManage ? (
              <Button
                title="Geri bildirimi sil"
                variant="outline"
                icon="trash-2"
                fullWidth
                loading={busy}
                onPress={() =>
                  confirmDestructive('Geri bildirimi sil', 'Bu kayıt silinsin mi?', () =>
                    submit(() => api.feedback.remove(f.id), { onSuccess: nav.goBack }),
                  )
                }
                style={{ marginTop: t.spacing[2] }}
              />
            ) : null}
          </>
        )}
      </Screen>
    </PermissionWrap>
  )
}

function PermissionWrap({ children, onBack }: { children: React.ReactNode; onBack: () => void }) {
  const { hasPermission } = useAuth()
  if (hasPermission(FeedbackPermissions.read)) return <>{children}</>
  return (
    <Screen header={{ title: 'Geri bildirim', onBack }}>
      <EmptyState icon="shield-off" title="Yetkiniz yok" description="Bu sayfayı görüntüleme izniniz yok." />
    </Screen>
  )
}
