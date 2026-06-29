// Sayım detayı — header + progress, the count lines (ürün · beklenen · sayılan ·
// fark), and the lifecycle action buttons (Başlat → Say (Tara) → İncelemeye Al →
// Onayla / İptal) driven by useSubmit. Expected qty + difference are hidden while
// a blind count is still in the counting phase. The segregation-of-duties 400
// ("sayan ≠ onaylayan") on approve is surfaced as an Alert by useSubmit.

import * as React from 'react'
import { Alert, View } from 'react-native'
import {
  IamPermissions,
  STOCK_COUNT_KIND_LABELS,
  STOCK_COUNT_STATUS_LABELS,
  StocktakePermissions,
} from '@turbohesap/shared'
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
import { formatDate } from '../../lib/datetime'
import { useAsync } from '../../lib/use-async'
import { confirmDestructive, useSubmit } from '../../lib/use-submit'
import { useNav } from '../../navigation/nav-context'
import { useTheme } from '../../theme/theme-context'
import { STATUS_TONES, diffTone, formatDiff, formatQty } from './format'

export function StockCountDetailScreen() {
  const t = useTheme()
  const nav = useNav()
  const { hasPermission } = useAuth()

  const canRead = hasPermission(StocktakePermissions.read)
  const canCreate = hasPermission(StocktakePermissions.create)
  const canCount = hasPermission(StocktakePermissions.count)
  const canReview = hasPermission(StocktakePermissions.review)
  const canApprove = hasPermission(StocktakePermissions.approve)
  const canCancel = hasPermission(StocktakePermissions.cancel)
  const canAudit = hasPermission(IamPermissions.auditRead)

  const id = String(nav.current.params?.id ?? '')
  const count = useAsync(() => api.stocktake.get(id), [id], { enabled: canRead && !!id })
  const lines = useAsync(() => api.stocktake.lines(id), [id], { enabled: canRead && !!id })
  const { submit, busy } = useSubmit()

  const doc = count.data
  const refetch = () => {
    count.refetch()
    lines.refetch()
  }

  const handleStart = () =>
    void submit(
      async () => {
        await api.stocktake.start(id)
        refetch()
      },
      { errorTitle: 'Sayım başlatılamadı' },
    )

  const handleReview = () =>
    void submit(
      async () => {
        await api.stocktake.review(id)
        refetch()
      },
      { errorTitle: 'İncelemeye alınamadı' },
    )

  const handleApprove = () =>
    confirmDestructive(
      'Onayla ve İşle',
      'Sayım onaylanacak ve fark stok hareketleri oluşturulacak. Bu işlem geri alınamaz. Devam edilsin mi?',
      () =>
        void submit(
          async () => {
            await api.stocktake.approve(id)
            refetch()
          },
          { errorTitle: 'Onaylanamadı' },
        ),
      'Onayla',
    )

  const handleCancel = () =>
    confirmDestructive(
      'Sayımı iptal et',
      'Bu sayım iptal edilecek. Devam edilsin mi?',
      () =>
        void submit(
          async () => {
            await api.stocktake.cancel(id)
            refetch()
          },
          { errorTitle: 'İptal edilemedi' },
        ),
      'İptal et',
    )

  const handleDelete = () =>
    confirmDestructive('Sayımı sil', 'Bu taslak sayım silinecek. Devam edilsin mi?', () =>
      void submit(
        async () => {
          await api.stocktake.remove(id)
          nav.goBack()
        },
        { errorTitle: 'Silinemedi' },
      ),
    )

  const openScanner = () => {
    if (!doc) return
    nav.navigate('stocktake.scan', { id, name: doc.name, blind: doc.blind }, 'Say (Tara)')
  }

  if (!canRead) {
    return (
      <Screen header={{ title: 'Sayım Detayı', onBack: nav.goBack }}>
        <EmptyState icon="shield-off" title="Yetkiniz yok" description="Bu sayfayı görüntüleme izniniz yok." />
      </Screen>
    )
  }

  // ── Action availability by status ──
  const isDraft = doc?.status === 'draft'
  const isCounting = doc?.status === 'counting'
  const isReview = doc?.status === 'review'
  // Blind + counting → hide expected/diff from the counter.
  const hideExpected = !!doc?.blind && isCounting

  const showStart = !!doc && canCreate && isDraft
  const showScan = !!doc && canCount && isCounting
  const showReview = !!doc && canReview && isCounting
  const showApprove = !!doc && canApprove && isReview
  const showRecountBack = !!doc && canReview && isReview
  const showCancel = !!doc && canCancel && (isDraft || isCounting || isReview)
  const showDelete = !!doc && canCreate && isDraft
  const hasActions = showStart || showScan || showReview || showApprove || showRecountBack || showCancel || showDelete

  const progress = doc && doc.lineCount > 0 ? doc.countedCount / doc.lineCount : 0

  return (
    <Screen
      header={{
        title: doc?.name || 'Sayım',
        subtitle: doc
          ? `${STOCK_COUNT_KIND_LABELS[doc.kind]} · ${doc.branchName ?? 'Tüm şubeler'}`
          : undefined,
        onBack: nav.goBack,
        right: doc ? (
          <>
            {canAudit ? (
              <HeaderAction
                icon="clock"
                onPress={() => nav.navigate('iam.audit.entity', { entityType: 'StockCount', entityId: id }, 'Denetim')}
              />
            ) : null}
            {showScan ? <HeaderAction icon="camera" onPress={openScanner} /> : null}
          </>
        ) : undefined,
      }}
      onRefresh={refetch}
      refreshing={count.refreshing || lines.refreshing}
      footer={
        doc && hasActions ? (
          <View style={{ gap: t.spacing[2.5] }}>
            {showStart ? (
              <Button title="Sayımı Başlat" icon="play" fullWidth loading={busy} onPress={handleStart} />
            ) : null}
            {showScan ? (
              <Button title="Say (Tara)" icon="camera" fullWidth loading={busy} onPress={openScanner} />
            ) : null}
            {showReview ? (
              <Button
                title="İncelemeye Al"
                icon="search"
                variant={showScan ? 'outline' : 'default'}
                fullWidth
                loading={busy}
                onPress={handleReview}
              />
            ) : null}
            {showApprove ? (
              <Button title="Onayla ve İşle" icon="check-circle" fullWidth loading={busy} onPress={handleApprove} />
            ) : null}
            {showDelete || showCancel ? (
              <View style={{ flexDirection: 'row', gap: t.spacing[3] }}>
                {showDelete ? (
                  <View style={{ flex: 1 }}>
                    <Button title="Sil" variant="destructive" fullWidth loading={busy} onPress={handleDelete} />
                  </View>
                ) : null}
                {showCancel ? (
                  <View style={{ flex: 1 }}>
                    <Button title="İptal Et" variant="destructive" fullWidth loading={busy} onPress={handleCancel} />
                  </View>
                ) : null}
              </View>
            ) : null}
          </View>
        ) : undefined
      }
    >
      {count.loading ? (
        <Card>
          <View style={{ gap: t.spacing[3] }}>
            <Skeleton width="40%" height={13} />
            <Skeleton width="60%" height={26} />
          </View>
        </Card>
      ) : count.error || !doc ? (
        <EmptyState
          icon="alert-triangle"
          tone="destructive"
          title="Yüklenemedi"
          description={count.error ?? 'Sayım bulunamadı.'}
          actionLabel="Tekrar dene"
          onAction={refetch}
        />
      ) : (
        <>
          {/* Progress card */}
          <Card>
            <View style={{ gap: t.spacing[3] }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text variant="overline" tone="muted">
                  İlerleme
                </Text>
                <Badge label={STOCK_COUNT_STATUS_LABELS[doc.status]} tone={STATUS_TONES[doc.status]} />
              </View>
              <Text variant="display" style={{ fontFamily: 'monospace' }}>
                {doc.countedCount}/{doc.lineCount}
              </Text>
              <ProgressBar value={progress} />
              <View style={{ flexDirection: 'row', gap: t.spacing[2], flexWrap: 'wrap' }}>
                <Badge label={`${doc.countedCount} sayıldı`} tone="primary" />
                {!hideExpected && doc.varianceCount > 0 ? (
                  <Badge label={`${doc.varianceCount} fark`} tone="warning" />
                ) : null}
                {doc.blind ? <Badge label="Kör sayım" tone="info" /> : null}
              </View>
            </View>
          </Card>

          <Section title="Genel">
            <Card>
              <FieldGrid>
                <Field label="Tür" value={STOCK_COUNT_KIND_LABELS[doc.kind]} />
                <Field label="Şube" value={doc.branchName ?? 'Tüm şubeler'} />
                <Field label="Eşik" value={`%${doc.recountThresholdPct}`} />
                <Field label="Durum" value={STOCK_COUNT_STATUS_LABELS[doc.status]} />
                {doc.startedAt ? <Field label="Başlangıç" value={formatDate(doc.startedAt)} /> : null}
                {doc.completedAt ? <Field label="Tamamlandı" value={formatDate(doc.completedAt)} /> : null}
                <Field label="Oluşturan" value={doc.createdByName} />
                {doc.approvedByName ? <Field label="Onaylayan" value={doc.approvedByName} /> : null}
                {doc.notes ? <Field label="Notlar" value={doc.notes} full /> : null}
              </FieldGrid>
            </Card>
          </Section>

          <Section title={`Kalemler (${doc.lineCount})`}>
            {lines.loading ? (
              <Card>
                <Skeleton width="60%" height={16} />
              </Card>
            ) : (lines.data ?? []).length === 0 ? (
              <EmptyState icon="list" title="Kalem yok" description="Bu sayımda kalem bulunmuyor." />
            ) : (
              <ListCard>
                {(lines.data ?? []).map((line) => {
                  const counted = line.status !== 'pending'
                  return (
                    <ListRow
                      key={line.id}
                      icon="package"
                      iconTone={counted ? 'primary' : 'muted'}
                      title={line.name}
                      subtitle={
                        hideExpected
                          ? `Sayılan: ${formatQty(line.countedQty)} ${line.unit}`
                          : `Beklenen: ${formatQty(line.expectedQty)} · Sayılan: ${formatQty(line.countedQty)} ${line.unit}`
                      }
                      trailing={
                        hideExpected ? (
                          counted ? (
                            <Badge label="Sayıldı" tone="success" />
                          ) : (
                            <Badge label="Bekliyor" tone="muted" />
                          )
                        ) : (
                          <View style={{ alignItems: 'flex-end', gap: 4 }}>
                            <Badge label={formatDiff(line.difference)} tone={diffTone(line.difference)} />
                            {line.recountRequested ? <Badge label="Tekrar say" tone="warning" /> : null}
                          </View>
                        )
                      }
                      onPress={
                        canReview && isReview
                          ? () => promptRecount(line.id, line.name, () =>
                              void submit(
                                async () => {
                                  await api.stocktake.requestRecount(id, line.id)
                                  refetch()
                                },
                                { errorTitle: 'Yeniden sayım istenemedi' },
                              ),
                            )
                          : undefined
                      }
                    />
                  )
                })}
              </ListCard>
            )}
          </Section>
        </>
      )}
    </Screen>
  )
}

function ProgressBar({ value }: { value: number }) {
  const t = useTheme()
  const pct = Math.max(0, Math.min(1, value))
  return (
    <View style={{ height: 8, borderRadius: 999, backgroundColor: t.colors.muted, overflow: 'hidden' }}>
      <View style={{ width: `${pct * 100}%`, height: '100%', backgroundColor: t.colors.primary }} />
    </View>
  )
}

function promptRecount(_lineId: string, name: string, onConfirm: () => void) {
  Alert.alert(name, 'Bu kalem için yeniden sayım istensin mi?', [
    { text: 'Vazgeç', style: 'cancel' },
    { text: 'Yeniden say', onPress: onConfirm },
  ])
}
