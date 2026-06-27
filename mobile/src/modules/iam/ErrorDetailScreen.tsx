// ErrorDetailScreen — a single captured error (/api/iam/error-logs/:id). Shows
// the message, context and stack trace; lets a triager change the status
// (iam.errors.write) and delete it (iam.errors.delete).

import * as React from 'react'
import { ScrollView, View } from 'react-native'

import { type ErrorLogStatus, IamPermissions } from '@turbohesap/shared'

import {
  Badge,
  type BadgeTone,
  Button,
  Card,
  EmptyState,
  Field,
  FieldGrid,
  FormSelect,
  Screen,
  Section,
  Skeleton,
  Text,
} from '../../components'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth/auth-context'
import { formatDateTime, formatRelative } from '../../lib/datetime'
import { useAsync } from '../../lib/use-async'
import { confirmDestructive, useSubmit } from '../../lib/use-submit'
import { useNav } from '../../navigation/nav-context'
import { useTheme } from '../../theme/theme-context'

const STATUS_META: Record<ErrorLogStatus, { tone: BadgeTone; label: string }> = {
  new: { tone: 'destructive', label: 'Yeni' },
  investigating: { tone: 'warning', label: 'İnceleniyor' },
  resolved: { tone: 'success', label: 'Çözüldü' },
  ignored: { tone: 'muted', label: 'Yok sayıldı' },
}
const STATUSES: ErrorLogStatus[] = ['new', 'investigating', 'resolved', 'ignored']

export function ErrorDetailScreen() {
  const t = useTheme()
  const nav = useNav()
  const { hasPermission } = useAuth()
  const canWrite = hasPermission(IamPermissions.errorsWrite)
  const canDelete = hasPermission(IamPermissions.errorsDelete)
  const id = String(nav.current.params?.id ?? '')
  const err = useAsync(() => api.iam.errorLogs.get(id), [id], {
    enabled: hasPermission(IamPermissions.errorsRead) && !!id,
  })
  const { submit, busy } = useSubmit()
  const [status, setStatus] = React.useState<ErrorLogStatus | null>(null)
  const e = err.data

  React.useEffect(() => {
    if (e) setStatus(e.status)
  }, [e])

  if (!hasPermission(IamPermissions.errorsRead)) {
    return (
      <Screen header={{ title: 'Hata kaydı', onBack: nav.goBack }}>
        <EmptyState icon="shield-off" title="Yetkiniz yok" description="Bu sayfayı görüntüleme izniniz yok." />
      </Screen>
    )
  }

  return (
    <Screen
      header={{ title: e ? e.exceptionType : 'Hata kaydı', subtitle: e ? `${e.origin} · ${e.statusCode}` : undefined, onBack: nav.goBack }}
      onRefresh={err.refetch}
      refreshing={err.refreshing}
    >
      {err.loading ? (
        <Card style={{ gap: t.spacing[3] }}>
          <Skeleton width="70%" height={16} />
          <Skeleton width="50%" height={14} />
        </Card>
      ) : err.error || !e ? (
        <EmptyState icon="alert-triangle" tone="destructive" title="Yüklenemedi" description={err.error ?? 'Kayıt bulunamadı.'} actionLabel="Tekrar dene" onAction={err.refetch} />
      ) : (
        <>
          <Card style={{ gap: t.spacing[3] }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing[1.5] }}>
              <Badge label={STATUS_META[e.status].label} tone={STATUS_META[e.status].tone} />
              <Badge label={e.origin === 'server' ? 'Sunucu' : 'İstemci'} tone="muted" />
              {e.occurrenceCount > 1 ? <Badge label={`×${e.occurrenceCount}`} tone="muted" /> : null}
            </View>
            <Text variant="body" weight="medium">
              {e.message}
            </Text>
            <FieldGrid>
              <Field label="Tür" value={e.exceptionType} />
              <Field label="Durum kodu" value={String(e.statusCode)} />
              <Field label="İlk görülme" value={formatDateTime(e.firstSeenAt)} />
              <Field label="Son görülme" value={formatRelative(e.lastSeenAt)} />
              {e.path ? <Field label="Yol" value={`${e.httpMethod ?? ''} ${e.path}`.trim()} full /> : null}
              {e.userName ? <Field label="Kullanıcı" value={e.userName} /> : null}
            </FieldGrid>
          </Card>

          {e.stackTrace ? (
            <Section title="Stack trace">
              <Card padded={false}>
                <ScrollView horizontal showsHorizontalScrollIndicator style={{ maxHeight: 260 }}>
                  <ScrollView showsVerticalScrollIndicator>
                    <Text variant="mono" style={{ padding: t.spacing[3] }}>
                      {e.stackTrace}
                    </Text>
                  </ScrollView>
                </ScrollView>
              </Card>
            </Section>
          ) : null}

          {canWrite && status ? (
            <Section title="Durum (triage)">
              <FormSelect
                value={status}
                onChange={setStatus}
                options={STATUSES.map((s) => ({ value: s, label: STATUS_META[s].label }))}
              />
              <Button
                title="Durumu kaydet"
                fullWidth
                loading={busy}
                disabled={status === e.status}
                onPress={() => submit(() => api.iam.errorLogs.update(e.id, { status }).then(() => undefined), { onSuccess: err.refetch })}
                style={{ marginTop: t.spacing[2] }}
              />
            </Section>
          ) : null}

          {canDelete ? (
            <Button
              title="Kaydı sil"
              variant="outline"
              icon="trash-2"
              fullWidth
              loading={busy}
              onPress={() =>
                confirmDestructive('Hata kaydını sil', 'Bu kayıt silinsin mi?', () =>
                  submit(() => api.iam.errorLogs.remove(e.id), { onSuccess: nav.goBack }),
                )
              }
              style={{ marginTop: t.spacing[2] }}
            />
          ) : null}
        </>
      )}
    </Screen>
  )
}
