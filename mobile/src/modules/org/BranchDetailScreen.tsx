// BranchDetailScreen — read-only branch detail with all address/contact/manager/
// tax fields. Edit (write-gated) opens the form; delete confirms then returns.

import * as React from 'react'
import { View } from 'react-native'

import { IamPermissions, OrgPermissions } from '@turbohesap/shared'

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
import { formatDate, formatDateTime } from '../../lib/datetime'
import { useAsync } from '../../lib/use-async'
import { confirmDestructive, useSubmit } from '../../lib/use-submit'
import { useNav } from '../../navigation/nav-context'
import { useTheme } from '../../theme/theme-context'
import { branchTypeLabel } from './labels'

export function BranchDetailScreen() {
  const t = useTheme()
  const nav = useNav()
  const { hasPermission } = useAuth()
  const canWrite = hasPermission(OrgPermissions.branchesWrite)
  const canAudit = hasPermission(IamPermissions.auditRead)
  const id = String(nav.current.params?.id ?? '')
  const branch = useAsync(() => api.org.branches.get(id), [id], {
    enabled: hasPermission(OrgPermissions.branchesRead) && !!id,
  })
  const { submit, busy } = useSubmit()
  const b = branch.data

  if (!hasPermission(OrgPermissions.branchesRead)) {
    return (
      <Screen header={{ title: 'Şube', onBack: nav.goBack }}>
        <EmptyState icon="shield-off" title="Yetkiniz yok" description="Bu sayfayı görüntüleme izniniz yok." />
      </Screen>
    )
  }

  return (
    <Screen
      header={{
        title: b?.name ?? 'Şube',
        subtitle: b ? `${b.code} · ${branchTypeLabel(b.type)}` : undefined,
        onBack: nav.goBack,
        right: b ? (
          <>
            {canAudit ? (
              <HeaderAction
                icon="clock"
                onPress={() => nav.navigate('iam.audit.entity', { entityType: 'Branch', entityId: b.id, title: b.name }, 'Denetim geçmişi')}
              />
            ) : null}
            {canWrite ? (
              <HeaderAction icon="edit-2" onPress={() => nav.navigate('org.branches.form', { id: b.id }, b.name)} />
            ) : null}
          </>
        ) : undefined,
      }}
      onRefresh={branch.refetch}
      refreshing={branch.refreshing}
    >
      {branch.loading ? (
        <Card style={{ gap: t.spacing[3] }}>
          <Skeleton width="60%" height={18} />
          <Skeleton width="40%" height={13} />
        </Card>
      ) : branch.error || !b ? (
        <EmptyState icon="alert-triangle" tone="destructive" title="Yüklenemedi" description={branch.error ?? 'Şube bulunamadı.'} actionLabel="Tekrar dene" onAction={branch.refetch} />
      ) : (
        <>
          <Section title="Genel">
            <Card style={{ gap: t.spacing[4] }}>
              <View style={{ flexDirection: 'row' }}>
                <Badge label={b.isActive ? 'Aktif' : 'Pasif'} tone={b.isActive ? 'success' : 'muted'} />
              </View>
              <FieldGrid>
                <Field label="Kod" value={b.code} mono />
                <Field label="Tür" value={branchTypeLabel(b.type)} />
                <Field label="Açılış" value={b.openingDate ? formatDate(b.openingDate) : '—'} />
                {b.description ? <Field label="Açıklama" value={b.description} full /> : null}
              </FieldGrid>
            </Card>
          </Section>

          <Section title="İletişim">
            <Card>
              <FieldGrid>
                <Field label="Telefon" value={b.phone || '—'} />
                <Field label="İkinci telefon" value={b.secondaryPhone || '—'} />
                <Field label="Faks" value={b.fax || '—'} />
                <Field label="E-posta" value={b.email || '—'} />
                {b.website ? <Field label="Web sitesi" value={b.website} full /> : null}
              </FieldGrid>
            </Card>
          </Section>

          <Section title="Adres">
            <Card>
              <FieldGrid>
                <Field label="Ülke" value={b.country || '—'} />
                <Field label="İl" value={b.city || '—'} />
                <Field label="İlçe" value={b.district || '—'} />
                <Field label="Mahalle" value={b.neighborhood || '—'} />
                <Field label="Posta kodu" value={b.postalCode || '—'} />
                <Field
                  label="Konum"
                  value={b.latitude != null && b.longitude != null ? `${b.latitude}, ${b.longitude}` : '—'}
                />
                {b.addressLine ? <Field label="Açık adres" value={b.addressLine} full /> : null}
              </FieldGrid>
            </Card>
          </Section>

          <Section title="Yetkili ve vergi">
            <Card>
              <FieldGrid>
                <Field label="Yetkili" value={b.managerName || '—'} />
                <Field label="Unvanı" value={b.managerTitle || '—'} />
                <Field label="Telefon" value={b.managerPhone || '—'} />
                <Field label="E-posta" value={b.managerEmail || '—'} />
                <Field label="Vergi dairesi" value={b.taxOffice || '—'} />
                <Field label="Vergi / TC no" value={b.taxNumber || '—'} />
              </FieldGrid>
            </Card>
          </Section>

          <Section title="Kayıt">
            <Card>
              <FieldGrid>
                <Field label="Oluşturma" value={formatDateTime(b.createdAt)} />
                <Field label="Güncelleme" value={formatDateTime(b.updatedAt)} />
              </FieldGrid>
            </Card>
          </Section>

          {canWrite ? (
            <Button
              title="Şubeyi sil"
              variant="outline"
              icon="trash-2"
              fullWidth
              loading={busy}
              onPress={() =>
                confirmDestructive('Şubeyi sil', `"${b.name}" silinsin mi?`, () =>
                  submit(() => api.org.branches.remove(b.id), { onSuccess: nav.goBack }),
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
