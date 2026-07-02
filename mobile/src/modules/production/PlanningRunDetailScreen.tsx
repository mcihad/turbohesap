// Planlama koşusu detayı — koşu bilgisi + öneriler (BOM patlatma seviyesine göre
// girintili). Üretim önerileri (manufacture) taslak Üretim Emrine dönüşür (apply).
// Uygulanan bir önerinin oluşturduğu MO'ya dokunarak gidilebilir.

import * as React from 'react'
import { Pressable, View } from 'react-native'
import { ProductionPermissions } from '@turbohesap/shared'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  FieldGrid,
  Icon,
  Screen,
  Section,
  Skeleton,
  Text,
} from '../../components'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth/auth-context'
import { formatDate } from '../../lib/datetime'
import { useAsync } from '../../lib/use-async'
import { confirmDestructive, useSubmit } from '../../lib/use-submit'
import { useNav } from '../../navigation/nav-context'
import { useTheme } from '../../theme/theme-context'
import { PLANNING_REASON_LABELS, PLANNING_STATUS_LABELS, PLANNING_STATUS_TONES, formatQty } from './format'

export function PlanningRunDetailScreen() {
  const t = useTheme()
  const nav = useNav()
  const { hasPermission } = useAuth()
  const canRead = hasPermission(ProductionPermissions.read)
  const canRun = hasPermission(ProductionPermissions.planningRun)

  const id = String(nav.current.params?.id ?? '')
  const run = useAsync(() => api.production.planning.get(id), [id], { enabled: canRead && !!id })
  const { submit, busy } = useSubmit()
  const doc = run.data

  const handleApply = () =>
    confirmDestructive(
      'Önerileri uygula',
      'Bekleyen üretim önerileri taslak üretim emirlerine dönüştürülecek. Devam edilsin mi?',
      () =>
        void submit(
          async () => {
            await api.production.planning.apply(id)
            run.refetch()
          },
          { errorTitle: 'Uygulanamadı' },
        ),
      'Uygula',
    )

  const handleCancel = () =>
    confirmDestructive(
      'Planlamayı iptal et',
      'Bu planlama koşusu iptal edilecek. Devam edilsin mi?',
      () =>
        void submit(
          async () => {
            await api.production.planning.cancel(id)
            run.refetch()
          },
          { errorTitle: 'İptal edilemedi' },
        ),
      'İptal et',
    )

  if (!canRead) {
    return (
      <Screen header={{ title: 'Planlama', onBack: nav.goBack }}>
        <EmptyState icon="shield-off" title="Yetkiniz yok" description="Bu sayfayı görüntüleme izniniz yok." />
      </Screen>
    )
  }

  const isDraft = doc?.status === 'draft'
  const hasActions = !!doc && canRun && isDraft

  return (
    <Screen
      header={{
        title: doc?.runNo || 'Planlama',
        subtitle: doc ? `${doc.suggestions.length} öneri` : undefined,
        onBack: nav.goBack,
      }}
      onRefresh={run.refetch}
      refreshing={run.refreshing}
      footer={
        hasActions ? (
          <View style={{ gap: t.spacing[2.5] }}>
            <Button title="Önerileri Uygula" icon="check" fullWidth loading={busy} onPress={handleApply} />
            <Button title="İptal Et" variant="destructive" fullWidth loading={busy} onPress={handleCancel} />
          </View>
        ) : undefined
      }
    >
      {run.loading ? (
        <Card>
          <View style={{ gap: t.spacing[3] }}>
            <Skeleton width="40%" height={13} />
            <Skeleton width="60%" height={26} />
          </View>
        </Card>
      ) : run.error || !doc ? (
        <EmptyState
          icon="alert-triangle"
          tone="destructive"
          title="Yüklenemedi"
          description={run.error ?? 'Planlama bulunamadı.'}
          actionLabel="Tekrar dene"
          onAction={run.refetch}
        />
      ) : (
        <>
          <Card>
            <View style={{ gap: t.spacing[3] }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text variant="overline" tone="muted">
                  MRP Koşusu
                </Text>
                <Badge label={PLANNING_STATUS_LABELS[doc.status]} tone={PLANNING_STATUS_TONES[doc.status]} />
              </View>
              <Text variant="display">{`${doc.suggestions.length} öneri`}</Text>
              <Text variant="caption" tone="muted">
                {formatDate(doc.runDate)}
              </Text>
            </View>
          </Card>

          <Section title="Genel">
            <Card>
              <FieldGrid>
                <Field label="Tarih" value={formatDate(doc.runDate)} />
                <Field label="Ufuk" value={`${doc.horizonDays} gün`} />
                <Field label="Durum" value={PLANNING_STATUS_LABELS[doc.status]} />
                {doc.notes ? <Field label="Notlar" value={doc.notes} full /> : null}
              </FieldGrid>
            </Card>
          </Section>

          <Section title={`Öneriler (${doc.suggestions.length})`}>
            {doc.suggestions.length === 0 ? (
              <EmptyState icon="inbox" title="Öneri yok" description="Bu koşuda öneri üretilmedi." />
            ) : (
              <View style={{ gap: t.spacing[2.5] }}>
                {doc.suggestions.map((s) => {
                  const isManufacture = s.suggestionType === 'manufacture'
                  const statusInfo =
                    s.status === 'applied'
                      ? { label: 'Uygulandı', tone: 'success' as const }
                      : s.status === 'dismissed'
                        ? { label: 'İptal', tone: 'muted' as const }
                        : { label: 'Bekliyor', tone: 'warning' as const }
                  const clickable = !!s.createdManufacturingOrderId
                  const inner = (
                    <Card>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing[3] }}>
                        <View
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: t.radius.lg,
                            backgroundColor: t.colors.primarySoft,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Icon
                            name={isManufacture ? 'settings' : 'shopping-cart'}
                            size={18}
                            color={t.colors.primary}
                          />
                        </View>
                        <View style={{ flex: 1, gap: 2 }}>
                          <Text variant="label" weight="semibold" numberOfLines={1}>
                            {s.productName}
                          </Text>
                          <Text variant="caption" tone="muted" numberOfLines={2}>
                            {`${PLANNING_REASON_LABELS[s.reason]} · ${formatQty(s.requiredQuantity)} ${s.unit}${s.suggestedDate ? ` · ${formatDate(s.suggestedDate)}` : ''}${s.level > 0 ? ` · L${s.level}` : ''}`}
                          </Text>
                        </View>
                        <View style={{ alignItems: 'flex-end', gap: 4 }}>
                          <Badge label={isManufacture ? 'Üretim' : 'Satınalma'} tone={isManufacture ? 'primary' : 'info'} />
                          <Badge label={statusInfo.label} tone={statusInfo.tone} />
                        </View>
                      </View>
                    </Card>
                  )
                  return (
                    <View key={s.id} style={{ marginLeft: s.level * t.spacing[4] }}>
                      {clickable ? (
                        <Pressable
                          onPress={() =>
                            nav.navigate(
                              'production.order.detail',
                              { id: s.createdManufacturingOrderId },
                              'Üretim Emri',
                            )
                          }
                        >
                          {inner}
                        </Pressable>
                      ) : (
                        inner
                      )}
                    </View>
                  )
                })}
              </View>
            )}
          </Section>
        </>
      )}
    </Screen>
  )
}
