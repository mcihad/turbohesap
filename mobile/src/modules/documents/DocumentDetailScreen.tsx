// DocumentDetailScreen — read-only evrak detail. Edit (documents.write), delete
// (the SEPARATE, stronger documents.delete permission), audit history
// (iam.audit.read), and a "Dosyalar" section (<ImageManager>, generic file
// component — works for any file type, not just images, via /api/files).
// Privacy: owner info only shown to the owner or a documents.private.manage
// holder, mirroring the category privacy model.

import * as React from 'react'
import { View } from 'react-native'

import {
  DocumentsPermissions,
  FilesPermissions,
  IamPermissions,
  type DocumentFieldDef,
  effectiveDocumentFieldDefsWithSource,
} from '@turbohesap/shared'

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
  Text,
} from '../../components'
import { ImageManager } from '../../components/image'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth/auth-context'
import { formatDate, formatDateTime } from '../../lib/datetime'
import { useAsync } from '../../lib/use-async'
import { confirmDestructive, useSubmit } from '../../lib/use-submit'
import { useNav } from '../../navigation/nav-context'
import { useTheme } from '../../theme/theme-context'
import { expiryStatusLabel, expiryStatusTone } from './labels'

export function DocumentDetailScreen() {
  const t = useTheme()
  const nav = useNav()
  const { hasPermission, user } = useAuth()
  const canWrite = hasPermission(DocumentsPermissions.documentsWrite)
  const canDelete = hasPermission(DocumentsPermissions.documentsDelete)
  const canAudit = hasPermission(IamPermissions.auditRead)
  const canFiles = hasPermission(FilesPermissions.write)
  const canPrivateManage = hasPermission(DocumentsPermissions.privateManage)
  const canReadCategories = hasPermission(DocumentsPermissions.categoriesRead)

  const id = String(nav.current.params?.id ?? '')
  const doc = useAsync(() => api.documents.documents.get(id), [id], {
    enabled: hasPermission(DocumentsPermissions.documentsRead) && !!id,
  })
  const categories = useAsync(() => api.documents.categories.list(), [], { enabled: canReadCategories })
  const { submit, busy } = useSubmit()
  const d = doc.data

  const attrGroups = React.useMemo(() => {
    if (!d) return [] as { id: string; name: string; fields: { def: DocumentFieldDef; value: unknown }[] }[]
    const sourced = effectiveDocumentFieldDefsWithSource(d.categoryId, categories.data ?? [])
    const used = new Set<string>()
    const groups: { id: string; name: string; fields: { def: DocumentFieldDef; value: unknown }[] }[] = []
    for (const sf of sourced) {
      const value = d.attributes?.[sf.def.key]
      if (value === undefined || value === '' || value === null) continue
      used.add(sf.def.key)
      let g = groups.find((x) => x.id === sf.sourceCategoryId)
      if (!g) {
        g = { id: sf.sourceCategoryId, name: sf.sourceName, fields: [] }
        groups.push(g)
      }
      g.fields.push({ def: sf.def, value })
    }
    const orphans = Object.entries(d.attributes ?? {}).filter(([k, v]) => !used.has(k) && v !== '' && v != null)
    if (orphans.length) {
      groups.push({
        id: '__other__',
        name: 'Diğer',
        fields: orphans.map(([k, value]) => ({ def: { key: k, label: k, type: 'text', required: false } as DocumentFieldDef, value })),
      })
    }
    return groups
  }, [d, categories.data])

  const canSeePrivacyInfo = !!d && (d.ownerId === user?.id || canPrivateManage)

  if (!hasPermission(DocumentsPermissions.documentsRead)) {
    return (
      <Screen header={{ title: 'Evrak', onBack: nav.goBack }}>
        <EmptyState icon="shield-off" title="Yetkiniz yok" description="Bu sayfayı görüntüleme izniniz yok." />
      </Screen>
    )
  }

  return (
    <Screen
      header={{
        title: d?.title ?? 'Evrak',
        subtitle: d?.code || undefined,
        onBack: nav.goBack,
        right: d ? (
          <>
            {canAudit ? (
              <HeaderAction icon="clock" onPress={() => nav.navigate('iam.audit.entity', { entityType: 'Document', entityId: d.id, title: d.title }, 'Denetim geçmişi')} />
            ) : null}
            {canWrite ? (
              <HeaderAction icon="edit-2" onPress={() => nav.navigate('documents.form', { id: d.id }, d.title)} />
            ) : null}
          </>
        ) : undefined,
      }}
      onRefresh={doc.refetch}
      refreshing={doc.refreshing}
    >
      {doc.loading ? (
        <Card style={{ gap: t.spacing[3] }}>
          <Skeleton width="60%" height={18} />
          <Skeleton width="40%" height={13} />
        </Card>
      ) : doc.error || !d ? (
        <EmptyState icon="alert-triangle" tone="destructive" title="Yüklenemedi" description={doc.error ?? 'Evrak bulunamadı.'} actionLabel="Tekrar dene" onAction={doc.refetch} />
      ) : (
        <>
          <Section title="Genel">
            <Card style={{ gap: t.spacing[4] }}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing[1.5] }}>
                {d.categoryName ? <Badge label={d.categoryName} tone="primary" /> : null}
                {d.expiryStatus !== 'none' ? <Badge label={expiryStatusLabel(d.expiryStatus)} tone={expiryStatusTone(d.expiryStatus)} /> : null}
                {d.isPrivate ? <Badge label="Kişiye özel" tone="muted" /> : null}
              </View>
              <FieldGrid>
                <Field label="Kod" value={d.code || '—'} mono />
                <Field label="Kategori" value={d.categoryName || '—'} />
                {d.description ? <Field label="Açıklama" value={d.description} full /> : null}
                {d.tags.length > 0 ? (
                  <Field
                    label="Etiketler"
                    value={
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing[1] }}>
                        {d.tags.map((tag) => (
                          <Badge key={tag} label={tag} tone="default" />
                        ))}
                      </View>
                    }
                    full
                  />
                ) : null}
              </FieldGrid>
            </Card>
          </Section>

          {d.isTimeBound ? (
            <Section title="Süreli evrak">
              <Card>
                <FieldGrid>
                  <Field label="Düzenleme tarihi" value={d.issueDate ? formatDate(d.issueDate) : '—'} />
                  <Field label="Son geçerlilik" value={d.expiryDate ? formatDate(d.expiryDate) : '—'} />
                  <Field label="Hatırlatma" value={d.reminderDaysBefore != null ? `${d.reminderDaysBefore} gün önce` : '—'} />
                  <Field label="Durum" value={<Badge label={expiryStatusLabel(d.expiryStatus)} tone={expiryStatusTone(d.expiryStatus)} />} />
                </FieldGrid>
              </Card>
            </Section>
          ) : null}

          {attrGroups.length > 0 ? (
            <Section title="Kategoriye özel alanlar">
              {attrGroups.map((g) => (
                <Card key={g.id} style={{ gap: t.spacing[3] }}>
                  <View style={{ flexDirection: 'row' }}>
                    <Badge label={g.name || 'Kategori'} tone="primary" />
                  </View>
                  <FieldGrid>
                    {g.fields.map(({ def, value }) => (
                      <Field key={def.key} label={def.label} value={formatAttr(def, value)} />
                    ))}
                  </FieldGrid>
                </Card>
              ))}
            </Section>
          ) : null}

          {canSeePrivacyInfo && d.isPrivate ? (
            <Section title="Gizlilik">
              <Card>
                <FieldGrid>
                  <Field label="Kişiye özel" value="Evet" />
                  <Field label="Sahibi" value={d.ownerName || '—'} />
                </FieldGrid>
              </Card>
            </Section>
          ) : null}

          <Section title="Dosyalar">
            <Card>
              <ImageManager entityType="Document" entityId={d.id} canWrite={canFiles && canWrite} title="Evrak dosyaları" />
            </Card>
          </Section>

          <Section title="Kayıt">
            <Card>
              <FieldGrid>
                <Field label="Oluşturan" value={d.createdByName || '—'} />
                <Field label="Oluşturma" value={formatDateTime(d.createdAt)} />
                <Field label="Güncelleme" value={formatDateTime(d.updatedAt)} />
                <Field label="Dosya sayısı" value={String(d.fileCount)} />
              </FieldGrid>
            </Card>
          </Section>

          {canDelete ? (
            <Button
              title="Evrakı sil"
              variant="outline"
              icon="trash-2"
              fullWidth
              loading={busy}
              onPress={() =>
                confirmDestructive('Evrakı sil', `"${d.title}" silinsin mi?`, () =>
                  submit(() => api.documents.documents.remove(d.id), { onSuccess: nav.goBack }),
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

// Format a custom attribute value according to its field definition's type.
function formatAttr(def: DocumentFieldDef, v: unknown): string {
  if (v === null || v === undefined || v === '') return '—'
  switch (def.type) {
    case 'boolean':
      return v ? 'Evet' : 'Hayır'
    case 'date':
      return formatDate(String(v))
    case 'daterange': {
      const r = (typeof v === 'object' ? v : {}) as { from?: string; to?: string }
      if (!r.from && !r.to) return '—'
      return `${r.from ? formatDate(r.from) : '…'} – ${r.to ? formatDate(r.to) : '…'}`
    }
    case 'multiselect':
      return Array.isArray(v) ? v.join(', ') : String(v)
    case 'money':
      return `${v}${def.currency ? ` ${def.currency}` : ''}`
    case 'number':
      return `${v}${def.unit ? ` ${def.unit}` : ''}`
    default:
      if (Array.isArray(v)) return v.join(', ')
      if (typeof v === 'object') return JSON.stringify(v)
      return String(v)
  }
}
