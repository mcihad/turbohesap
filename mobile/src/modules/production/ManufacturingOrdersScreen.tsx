// Üretim Emirleri listesi — status filter chips + a "+" create action. Mirrors the
// orders list shell (chips + ListCard rows); tapping a row drills into the MO
// detail. Each row shows the product, planned/produced progress, priority and a
// status badge (+ an MTO tag for make-to-order emirleri).

import * as React from 'react'
import { Pressable, ScrollView, View } from 'react-native'
import {
  PRODUCTION_PRIORITY_LABELS,
  ProductionPermissions,
  type ProductionOrderStatus,
} from '@turbohesap/shared'
import {
  Badge,
  EmptyState,
  HeaderAction,
  ListCard,
  ListRow,
  PermissionRequired,
  Screen,
  SkeletonRows,
  Text,
} from '../../components'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth/auth-context'
import { useAsync } from '../../lib/use-async'
import { useNav } from '../../navigation/nav-context'
import { useTheme } from '../../theme/theme-context'
import { MO_STATUS_TONES, PRIORITY_TONES, PRODUCTION_ORDER_STATUS_LABELS, formatQty } from './format'

type StatusFilter = 'all' | ProductionOrderStatus

export function ManufacturingOrdersScreen() {
  const t = useTheme()
  const nav = useNav()
  const { hasPermission } = useAuth()
  const canRead = hasPermission(ProductionPermissions.read)
  const canWrite = hasPermission(ProductionPermissions.ordersWrite)
  const [filter, setFilter] = React.useState<StatusFilter>('all')

  const orders = useAsync(() => api.production.orders.list(), [], { enabled: canRead })
  const list = orders.data ?? []

  const statusFilters = React.useMemo<StatusFilter[]>(() => {
    const present: ProductionOrderStatus[] = []
    for (const o of list) if (!present.includes(o.status)) present.push(o.status)
    return ['all', ...present]
  }, [list])

  const filtered = React.useMemo(
    () => (filter === 'all' ? list : list.filter((o) => o.status === filter)),
    [list, filter],
  )

  const openForm = () => nav.navigate('production.order.entry', {}, 'Yeni üretim emri')

  return (
    <PermissionRequired
      permission={ProductionPermissions.read}
      title="Üretim Emirleri"
      onBack={nav.canGoBack ? nav.goBack : undefined}
    >
      <Screen
        header={{
          title: 'Üretim Emirleri',
          large: !nav.canGoBack,
          onBack: nav.canGoBack ? nav.goBack : undefined,
          right: canWrite ? <HeaderAction icon="plus" onPress={openForm} /> : undefined,
        }}
        onRefresh={orders.refetch}
        refreshing={orders.refreshing}
      >
        {statusFilters.length > 1 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: t.spacing[2], paddingHorizontal: t.spacing[0.5] }}
          >
            {statusFilters.map((s) => {
              const active = s === filter
              return (
                <Pressable
                  key={s}
                  onPress={() => setFilter(s)}
                  style={{
                    paddingHorizontal: t.spacing[3],
                    paddingVertical: t.spacing[1.5],
                    borderRadius: t.radius.full,
                    borderWidth: 1,
                    borderColor: active ? t.colors.primary : t.colors.border,
                    backgroundColor: active ? t.colors.primary : 'transparent',
                  }}
                >
                  <Text
                    variant="caption"
                    weight="semibold"
                    style={{ color: active ? t.colors.primaryForeground : t.colors.mutedForeground }}
                  >
                    {s === 'all' ? 'Tümü' : PRODUCTION_ORDER_STATUS_LABELS[s]}
                  </Text>
                </Pressable>
              )
            })}
          </ScrollView>
        ) : null}

        {orders.loading ? (
          <SkeletonRows count={6} />
        ) : orders.error ? (
          <EmptyState
            icon="alert-triangle"
            tone="destructive"
            title="Yüklenemedi"
            description={orders.error}
            actionLabel="Tekrar dene"
            onAction={orders.refetch}
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="clipboard"
            title="Üretim emri bulunamadı"
            description={filter === 'all' ? 'Henüz üretim emri oluşturulmamış.' : 'Bu durumda emir yok.'}
            actionLabel={canWrite && filter === 'all' ? 'Yeni üretim emri' : undefined}
            onAction={canWrite && filter === 'all' ? openForm : undefined}
          />
        ) : (
          <>
            <Text variant="overline" tone="muted" style={{ paddingHorizontal: t.spacing[1] }}>
              {filtered.length} Emir
            </Text>
            <ListCard>
              {filtered.map((o) => (
                <ListRow
                  key={o.id}
                  icon="clipboard"
                  title={o.orderNo}
                  subtitle={`${o.productName} · ${PRODUCTION_PRIORITY_LABELS[o.priority]}${o.sourceMode === 'mto' ? ' · MTO' : ''}`}
                  trailing={
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <Text style={{ fontWeight: 'bold', fontFamily: 'monospace' }}>
                        {formatQty(o.producedQuantity)}/{formatQty(o.plannedQuantity)} {o.unit}
                      </Text>
                      <View style={{ flexDirection: 'row', gap: 4 }}>
                        {o.priority === 'urgent' || o.priority === 'high' ? (
                          <Badge label={PRODUCTION_PRIORITY_LABELS[o.priority]} tone={PRIORITY_TONES[o.priority]} />
                        ) : null}
                        <Badge label={PRODUCTION_ORDER_STATUS_LABELS[o.status]} tone={MO_STATUS_TONES[o.status]} />
                      </View>
                    </View>
                  }
                  onPress={() => nav.navigate('production.order.detail', { id: o.id }, o.orderNo)}
                />
              ))}
            </ListCard>
          </>
        )}
      </Screen>
    </PermissionRequired>
  )
}
