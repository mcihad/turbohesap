import * as React from 'react'
import { Pressable, ScrollView, View } from 'react-native'
import {
  ORDER_DIRECTION_LABELS,
  OrdersPermissions,
  type OrderDirection,
  type OrderKind,
  type OrderStatus,
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
import { formatDate } from '../../lib/datetime'
import { useAsync } from '../../lib/use-async'
import { useNav } from '../../navigation/nav-context'
import { useTheme } from '../../theme/theme-context'
import {
  formatMoney,
  KIND_ICONS,
  KIND_PLURAL_LABELS,
  ORDER_KIND_LABELS,
  ORDER_STATUS_LABELS,
  STATUS_TONES,
} from './format'

type StatusFilter = 'all' | OrderStatus

export function OrdersListScreen({ kind }: { kind: OrderKind }) {
  const t = useTheme()
  const nav = useNav()
  const { hasPermission } = useAuth()
  const canRead = hasPermission(OrdersPermissions.read)
  const canWrite = hasPermission(OrdersPermissions.write)
  const [filter, setFilter] = React.useState<StatusFilter>('all')

  const title = KIND_PLURAL_LABELS[kind]
  const orders = useAsync(() => api.orders.list({ kind }), [kind], { enabled: canRead })

  const list = orders.data ?? []

  // Only surface the status chips that actually occur in the loaded data.
  const statusFilters = React.useMemo<StatusFilter[]>(() => {
    const present: OrderStatus[] = []
    for (const o of list) if (!present.includes(o.status)) present.push(o.status)
    return ['all', ...present]
  }, [list])

  const filtered = React.useMemo(
    () => (filter === 'all' ? list : list.filter((o) => o.status === filter)),
    [list, filter],
  )

  // New documents default to a sales direction; the entry screen lets the user flip it.
  const openForm = (direction: OrderDirection = 'sales') =>
    nav.navigate('orders.entry', { kind, direction }, `Yeni ${ORDER_KIND_LABELS[kind].toLowerCase()}`)

  return (
    <PermissionRequired
      permission={OrdersPermissions.read}
      title={title}
      onBack={nav.canGoBack ? nav.goBack : undefined}
    >
      <Screen
        header={{
          title,
          large: !nav.canGoBack,
          onBack: nav.canGoBack ? nav.goBack : undefined,
          right: canWrite ? <HeaderAction icon="plus" onPress={() => openForm()} /> : undefined,
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
                    {s === 'all' ? 'Tümü' : ORDER_STATUS_LABELS[s]}
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
            icon={KIND_ICONS[kind]}
            title={`${ORDER_KIND_LABELS[kind]} bulunamadı`}
            description={filter === 'all' ? 'Henüz belge oluşturulmamış.' : 'Bu durumda belge bulunamadı.'}
            actionLabel={canWrite && filter === 'all' ? `Yeni ${ORDER_KIND_LABELS[kind].toLowerCase()}` : undefined}
            onAction={canWrite && filter === 'all' ? () => openForm() : undefined}
          />
        ) : (
          <>
            <Text variant="overline" tone="muted" style={{ paddingHorizontal: t.spacing[1] }}>
              {filtered.length} Belge
            </Text>
            <ListCard>
              {filtered.map((o) => (
                <ListRow
                  key={o.id}
                  icon={o.direction === 'purchase' ? 'arrow-down-left' : KIND_ICONS[kind]}
                  title={o.number || 'Taslak'}
                  subtitle={`${o.contactName || 'Cari yok'} · ${ORDER_DIRECTION_LABELS[o.direction]} · ${formatDate(o.date)}`}
                  trailing={
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <Text style={{ fontWeight: 'bold', fontFamily: 'monospace' }}>
                        {formatMoney(o.grandTotal, o.currencyCode)}
                      </Text>
                      <Badge label={ORDER_STATUS_LABELS[o.status]} tone={STATUS_TONES[o.status]} />
                    </View>
                  }
                  onPress={() => nav.navigate('orders.detail', { id: o.id }, o.number || ORDER_KIND_LABELS[kind])}
                />
              ))}
            </ListCard>
          </>
        )}
      </Screen>
    </PermissionRequired>
  )
}
