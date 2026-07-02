// Reçete detayı — header + hero, genel bilgiler, bileşenler, operasyonlar (rota)
// ve yan ürünler. Read-only view with an edit action + delete (write). Mirrors
// OrderDetailScreen (Card + Section + FieldGrid + ListCard + footer actions).

import * as React from 'react'
import { View } from 'react-native'
import { IamPermissions, ProductionPermissions } from '@turbohesap/shared'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  FieldGrid,
  HeaderAction,
  ListCard,
  ListRow,
  Screen,
  Section,
  Skeleton,
  Text,
} from '../../components'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth/auth-context'
import { useAsync } from '../../lib/use-async'
import { confirmDestructive, useSubmit } from '../../lib/use-submit'
import { useNav } from '../../navigation/nav-context'
import { useTheme } from '../../theme/theme-context'
import { BOM_TYPE_LABELS, BOM_TYPE_TONES, CONSUMPTION_POLICY_LABELS, formatQty } from './format'

export function BomDetailScreen() {
  const t = useTheme()
  const nav = useNav()
  const { hasPermission } = useAuth()

  const canRead = hasPermission(ProductionPermissions.read)
  const canWrite = hasPermission(ProductionPermissions.write)
  const canAudit = hasPermission(IamPermissions.auditRead)

  const id = String(nav.current.params?.id ?? '')
  const bom = useAsync(() => api.production.boms.get(id), [id], { enabled: canRead && !!id })
  const { submit, busy } = useSubmit()

  const doc = bom.data

  const handleDelete = () =>
    confirmDestructive('Reçeteyi sil', 'Bu reçete silinecek. Devam edilsin mi?', () =>
      void submit(
        async () => {
          await api.production.boms.remove(id)
          nav.goBack()
        },
        { errorTitle: 'Silinemedi' },
      ),
    )

  if (!canRead) {
    return (
      <Screen header={{ title: 'Reçete', onBack: nav.goBack }}>
        <EmptyState icon="shield-off" title="Yetkiniz yok" description="Bu sayfayı görüntüleme izniniz yok." />
      </Screen>
    )
  }

  return (
    <Screen
      header={{
        title: doc?.name || doc?.code || 'Reçete',
        subtitle: doc?.productName,
        onBack: nav.goBack,
        right: doc ? (
          <>
            {canAudit ? (
              <HeaderAction
                icon="clock"
                onPress={() => nav.navigate('iam.audit.entity', { entityType: 'Bom', entityId: id }, 'Denetim')}
              />
            ) : null}
            {canWrite ? (
              <HeaderAction icon="edit-2" onPress={() => nav.navigate('production.bom.entry', { id }, 'Reçete düzenle')} />
            ) : null}
          </>
        ) : undefined,
      }}
      onRefresh={bom.refetch}
      refreshing={bom.refreshing}
      footer={
        doc && canWrite ? (
          <Button title="Sil" variant="destructive" fullWidth loading={busy} onPress={handleDelete} />
        ) : undefined
      }
    >
      {bom.loading ? (
        <Card>
          <View style={{ gap: t.spacing[3] }}>
            <Skeleton width="40%" height={13} />
            <Skeleton width="60%" height={26} />
          </View>
        </Card>
      ) : bom.error || !doc ? (
        <EmptyState
          icon="alert-triangle"
          tone="destructive"
          title="Yüklenemedi"
          description={bom.error ?? 'Reçete bulunamadı.'}
          actionLabel="Tekrar dene"
          onAction={bom.refetch}
        />
      ) : (
        <>
          <Card>
            <View style={{ gap: t.spacing[3] }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text variant="overline" tone="muted">
                  Reçete
                </Text>
                <Badge label={BOM_TYPE_LABELS[doc.type]} tone={BOM_TYPE_TONES[doc.type]} />
              </View>
              <Text variant="h1">{doc.productName}</Text>
              <Text variant="caption" tone="muted">
                v{doc.version} · {formatQty(doc.outputQuantity)} {doc.unit} çıktı · {doc.components.length} bileşen
              </Text>
            </View>
          </Card>

          <Section title="Genel">
            <Card>
              <FieldGrid>
                <Field label="Ürün" value={doc.productName} full />
                <Field label="Kod" value={doc.code} mono />
                <Field label="Tür" value={BOM_TYPE_LABELS[doc.type]} />
                <Field label="Sürüm" value={`v${doc.version}`} />
                <Field label="Çıktı" value={`${formatQty(doc.outputQuantity)} ${doc.unit}`} />
                <Field label="Tüketim Politikası" value={CONSUMPTION_POLICY_LABELS[doc.consumptionPolicy]} />
                {doc.manufLeadTimeDays != null ? (
                  <Field label="Termin (gün)" value={String(doc.manufLeadTimeDays)} />
                ) : null}
                <Field label="Durum" value={doc.isActive ? 'Aktif' : 'Pasif'} />
                {doc.notes ? <Field label="Notlar" value={doc.notes} full /> : null}
              </FieldGrid>
            </Card>
          </Section>

          <Section title={`Bileşenler (${doc.components.length})`}>
            {doc.components.length === 0 ? (
              <EmptyState icon="list" title="Bileşen yok" description="Bu reçetede bileşen bulunmuyor." />
            ) : (
              <ListCard>
                {doc.components.map((c) => (
                  <ListRow
                    key={c.id}
                    icon="package"
                    title={c.componentName}
                    subtitle={`${formatQty(c.quantity)} ${c.unit}${c.scrapRate > 0 ? ` · fire %${Math.round(c.scrapRate * 100)}` : ''}`}
                    trailing={c.isOptional ? <Badge label="Opsiyonel" tone="muted" /> : undefined}
                  />
                ))}
              </ListCard>
            )}
          </Section>

          {doc.operations.length > 0 ? (
            <Section title={`Operasyonlar (${doc.operations.length})`}>
              <ListCard>
                {doc.operations.map((o) => (
                  <ListRow
                    key={o.id}
                    icon="tool"
                    title={`${o.sequence}. ${o.name}`}
                    subtitle={`${o.workCenterName} · hazırlık ${o.setupTimeMinutes}dk · birim ${o.timePerUnitMinutes}dk`}
                    trailing={o.qualityCheckRequired ? <Badge label="Kalite" tone="warning" /> : undefined}
                  />
                ))}
              </ListCard>
            </Section>
          ) : null}

          {doc.byproducts.length > 0 ? (
            <Section title={`Yan Ürünler (${doc.byproducts.length})`}>
              <ListCard>
                {doc.byproducts.map((b) => (
                  <ListRow
                    key={b.id}
                    icon="gift"
                    title={b.productName}
                    subtitle={`${formatQty(b.quantity)} ${b.unit} · pay %${Math.round(b.costShareRate * 100)}`}
                  />
                ))}
              </ListCard>
            </Section>
          ) : null}
        </>
      )}
    </Screen>
  )
}
