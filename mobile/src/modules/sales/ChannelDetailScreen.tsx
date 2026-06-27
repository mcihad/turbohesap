// ChannelDetailScreen — read-only sales channel detail. Edit (write-gated) opens
// the form; delete confirms then returns to the list.

import * as React from 'react'
import { View } from 'react-native'

import { IamPermissions, SalesPermissions } from '@turbohesap/shared'

import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  FieldGrid,
  HeaderAction,
  Screen,
  Section,
  Skeleton,
} from '../../components'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth/auth-context'
import { formatDateTime } from '../../lib/datetime'
import { useAsync } from '../../lib/use-async'
import { confirmDestructive, useSubmit } from '../../lib/use-submit'
import { useNav } from '../../navigation/nav-context'
import { useTheme } from '../../theme/theme-context'
import { salesChannelTypeLabel } from './labels'

export function ChannelDetailScreen() {
  const t = useTheme()
  const nav = useNav()
  const { hasPermission } = useAuth()
  const canWrite = hasPermission(SalesPermissions.channelsWrite)
  const canAudit = hasPermission(IamPermissions.auditRead)
  const id = String(nav.current.params?.id ?? '')
  const channel = useAsync(() => api.sales.channels.get(id), [id], {
    enabled: hasPermission(SalesPermissions.channelsRead) && !!id,
  })
  const { submit, busy } = useSubmit()

  const c = channel.data

  return (
    <PermissionWrap onBack={nav.goBack}>
      <Screen
        header={{
          title: c?.name ?? 'Satış kanalı',
          subtitle: c ? `${c.code} · ${salesChannelTypeLabel(c.type)}` : undefined,
          onBack: nav.goBack,
          right: c ? (
            <>
              {canAudit ? (
                <HeaderAction
                  icon="clock"
                  onPress={() => nav.navigate('iam.audit.entity', { entityType: 'SalesChannel', entityId: c.id, title: c.name }, 'Denetim geçmişi')}
                />
              ) : null}
              {canWrite ? (
                <HeaderAction icon="edit-2" onPress={() => nav.navigate('sales.channels.form', { id: c.id }, c.name)} />
              ) : null}
            </>
          ) : undefined,
        }}
        onRefresh={channel.refetch}
        refreshing={channel.refreshing}
      >
        {channel.loading ? (
          <Card style={{ gap: t.spacing[3] }}>
            <Skeleton width="60%" height={18} />
            <Skeleton width="40%" height={13} />
          </Card>
        ) : channel.error || !c ? (
          <EmptyState icon="alert-triangle" tone="destructive" title="Yüklenemedi" description={channel.error ?? 'Kanal bulunamadı.'} actionLabel="Tekrar dene" onAction={channel.refetch} />
        ) : (
          <>
            <Section title="Genel">
              <Card style={{ gap: t.spacing[4] }}>
                <View style={{ flexDirection: 'row', gap: t.spacing[1.5] }}>
                  <Badge label={c.isActive ? 'Aktif' : 'Pasif'} tone={c.isActive ? 'success' : 'muted'} />
                  {c.isDefault ? <Badge label="Varsayılan" tone="info" /> : null}
                </View>
                <FieldGrid>
                  <Field label="Kod" value={c.code} mono />
                  <Field label="Tür" value={salesChannelTypeLabel(c.type)} />
                  <Field label="Para birimi" value={c.currency || '—'} />
                  <Field label="Komisyon" value={c.commissionRate == null ? '—' : `%${c.commissionRate}`} />
                  <Field label="Sıra" value={String(c.sortOrder)} />
                  <Field label="Web sitesi" value={c.website || '—'} />
                  {c.description ? <Field label="Açıklama" value={c.description} full /> : null}
                </FieldGrid>
              </Card>
            </Section>

            <Section title="İletişim ve yetkili">
              <Card>
                <FieldGrid>
                  <Field label="Yetkili" value={c.contactName || '—'} />
                  <Field label="Unvanı" value={c.contactTitle || '—'} />
                  <Field label="Telefon" value={c.contactPhone || '—'} />
                  <Field label="E-posta" value={c.contactEmail || '—'} />
                </FieldGrid>
              </Card>
            </Section>

            <Section title="Adres">
              <Card>
                <FieldGrid>
                  <Field label="Ülke" value={c.country || '—'} />
                  <Field label="İl" value={c.city || '—'} />
                  <Field label="İlçe" value={c.district || '—'} />
                  <Field label="Posta kodu" value={c.postalCode || '—'} />
                  {c.addressLine ? <Field label="Açık adres" value={c.addressLine} full /> : null}
                </FieldGrid>
              </Card>
            </Section>

            <Section title="Kayıt">
              <Card>
                <FieldGrid>
                  <Field label="Oluşturma" value={formatDateTime(c.createdAt)} />
                  <Field label="Güncelleme" value={formatDateTime(c.updatedAt)} />
                </FieldGrid>
              </Card>
            </Section>

            {canWrite ? (
              <Button
                title="Kanalı sil"
                variant="outline"
                icon="trash-2"
                fullWidth
                loading={busy}
                onPress={() =>
                  confirmDestructive('Kanalı sil', `"${c.name}" silinsin mi?`, () =>
                    submit(() => api.sales.channels.remove(c.id), { onSuccess: nav.goBack }),
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

// Local permission wrapper so the back button shows even on the forbidden state.
function PermissionWrap({ children, onBack }: { children: React.ReactNode; onBack: () => void }) {
  const { hasPermission } = useAuth()
  if (hasPermission(SalesPermissions.channelsRead)) return <>{children}</>
  return (
    <Screen header={{ title: 'Satış kanalı', onBack }}>
      <EmptyState icon="shield-off" title="Yetkiniz yok" description="Bu sayfayı görüntüleme izniniz yok." />
    </Screen>
  )
}
