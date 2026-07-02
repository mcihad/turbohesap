// Parti/Seri izlenebilirlik (şecere) — iki yönlü genealogy. "Girdi Partileri"
// (yukarı) = bu partiyi üreten üretim emirlerinin tükettiği hammadde partileri.
// "Kullanıldığı Yerler / Geri Çağırma" (aşağı) = bu partiyi tüketen emirler ve
// ürettikleri mamul partileri (recall analizi). Her emir dokunulabilir → Üretim
// Emri detayı. api.production.lots.trace(lotId).

import * as React from 'react'
import { View } from 'react-native'
import { ProductionPermissions, type LotRef } from '@turbohesap/shared'
import {
  Badge,
  Card,
  EmptyState,
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
import { useNav } from '../../navigation/nav-context'
import { useTheme } from '../../theme/theme-context'
import { formatQty } from './format'

export function LotTraceScreen() {
  const t = useTheme()
  const nav = useNav()
  const { hasPermission } = useAuth()
  const canRead = hasPermission(ProductionPermissions.read)

  const lotId = String(nav.current.params?.lotId ?? nav.current.params?.id ?? '')
  const paramLotNo = nav.current.params?.lotNo ? String(nav.current.params.lotNo) : ''
  const trace = useAsync(() => api.production.lots.trace(lotId), [lotId], { enabled: canRead && !!lotId })
  const doc = trace.data

  if (!canRead) {
    return (
      <Screen header={{ title: 'İzlenebilirlik', onBack: nav.goBack }}>
        <EmptyState icon="shield-off" title="Yetkiniz yok" description="Bu sayfayı görüntüleme izniniz yok." />
      </Screen>
    )
  }

  const openOrder = (moId: string, moNo: string) => nav.navigate('production.order.detail', { id: moId }, moNo)

  return (
    <Screen
      header={{ title: doc?.lot.lotNo || paramLotNo || 'İzlenebilirlik', onBack: nav.goBack }}
      onRefresh={trace.refetch}
      refreshing={trace.refreshing}
    >
      {trace.loading ? (
        <Card>
          <View style={{ gap: t.spacing[3] }}>
            <Skeleton width="40%" height={13} />
            <Skeleton width="60%" height={26} />
          </View>
        </Card>
      ) : trace.error || !doc ? (
        <EmptyState
          icon="alert-triangle"
          tone="destructive"
          title="Yüklenemedi"
          description={trace.error ?? 'Parti bulunamadı.'}
          actionLabel="Tekrar dene"
          onAction={trace.refetch}
        />
      ) : (
        <>
          <Card>
            <View style={{ gap: t.spacing[3] }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text variant="overline" tone="muted">
                  Parti/Seri
                </Text>
                <Badge label={doc.lot.kind === 'serial' ? 'Seri' : 'Parti'} tone={doc.lot.kind === 'serial' ? 'info' : 'muted'} />
              </View>
              <Text variant="h1" style={{ fontFamily: 'monospace' }}>
                {doc.lot.lotNo}
              </Text>
              <Text variant="caption" tone="muted">
                {doc.lot.productName}
                {doc.lot.notes ? ` · ${doc.lot.notes}` : ''}
              </Text>
            </View>
          </Card>

          <Section title="Girdi Partileri (Yukarı)">
            <Text variant="caption" tone="muted" style={{ paddingHorizontal: t.spacing[1] }}>
              Bu partiyi üreten üretim emirlerinin tükettiği hammadde partileri.
            </Text>
            {doc.producedFrom.length === 0 ? (
              <EmptyState icon="corner-left-up" title="Girdi partisi yok" description="Bu parti bir üretimde üretilmemiş." />
            ) : (
              doc.producedFrom.map((entry) => (
                <TraceGroup
                  key={`up:${entry.manufacturingOrderId}`}
                  moNo={entry.manufacturingOrderNo}
                  refs={entry.consumedLots}
                  refIcon="arrow-down-circle"
                  onPressOrder={() => openOrder(entry.manufacturingOrderId, entry.manufacturingOrderNo)}
                />
              ))
            )}
          </Section>

          <Section title="Kullanıldığı Yerler / Geri Çağırma (Aşağı)">
            <Text variant="caption" tone="muted" style={{ paddingHorizontal: t.spacing[1] }}>
              Bu partiyi tüketen üretim emirleri ve ürettikleri mamul partileri.
            </Text>
            {doc.consumedInto.length === 0 ? (
              <EmptyState icon="corner-right-down" title="Kullanım yok" description="Bu parti henüz bir üretimde tüketilmemiş." />
            ) : (
              doc.consumedInto.map((entry) => (
                <TraceGroup
                  key={`down:${entry.manufacturingOrderId}`}
                  moNo={entry.manufacturingOrderNo}
                  refs={entry.producedLots}
                  refIcon="arrow-up-circle"
                  onPressOrder={() => openOrder(entry.manufacturingOrderId, entry.manufacturingOrderNo)}
                />
              ))
            )}
          </Section>
        </>
      )}
    </Screen>
  )
}

function TraceGroup({
  moNo,
  refs,
  refIcon,
  onPressOrder,
}: {
  moNo: string
  refs: LotRef[]
  refIcon: 'arrow-down-circle' | 'arrow-up-circle'
  onPressOrder: () => void
}) {
  const t = useTheme()
  return (
    <ListCard>
      <ListRow icon="clipboard" title={moNo} subtitle={`${refs.length} parti`} onPress={onPressOrder} />
      {refs.map((r) => (
        <ListRow
          key={r.lotId}
          icon={refIcon}
          iconTone="muted"
          title={r.productName}
          subtitle={r.lotNo}
          trailing={
            <Text style={{ fontWeight: 'bold', fontFamily: 'monospace' }}>{formatQty(r.quantity)}</Text>
          }
        />
      ))}
    </ListCard>
  )
}
