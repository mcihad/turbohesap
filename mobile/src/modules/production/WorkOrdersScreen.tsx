// İş Emirleri (saha terminali girişi) — the shop-floor work-order queue. Status
// filter chips; actionable emirler (çalışıyor / duraklatıldı / hazır) are floated
// to the top so an operator sees what to work on first. Tapping a row opens the
// WorkOrderTerminalScreen (start/pause/resume/finish + barkod). Work orders are
// created when a Üretim Emri is onaylandı, so there's no create action here.

import * as React from 'react'
import { Pressable, ScrollView, View } from 'react-native'
import { ProductionPermissions, type WorkOrderStatus } from '@turbohesap/shared'
import {
  Badge,
  EmptyState,
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
import { WO_STATUS_ICONS, WO_STATUS_TONES, WORK_ORDER_STATUS_LABELS, formatQty } from './format'

type StatusFilter = 'all' | WorkOrderStatus

// Actionable-first ordering for the shop floor.
const SORT_RANK: Record<WorkOrderStatus, number> = {
  in_progress: 0,
  paused: 1,
  ready: 2,
  pending: 3,
  done: 4,
  cancelled: 5,
}

export function WorkOrdersScreen() {
  const t = useTheme()
  const nav = useNav()
  const { hasPermission } = useAuth()
  const canRead = hasPermission(ProductionPermissions.read)
  const [filter, setFilter] = React.useState<StatusFilter>('all')

  const workOrders = useAsync(() => api.production.workOrders.list(), [], { enabled: canRead })
  const list = workOrders.data ?? []

  const statusFilters = React.useMemo<StatusFilter[]>(() => {
    const present: WorkOrderStatus[] = []
    for (const w of list) if (!present.includes(w.status)) present.push(w.status)
    present.sort((a, b) => SORT_RANK[a] - SORT_RANK[b])
    return ['all', ...present]
  }, [list])

  const filtered = React.useMemo(() => {
    const base = filter === 'all' ? list : list.filter((w) => w.status === filter)
    return [...base].sort((a, b) => SORT_RANK[a.status] - SORT_RANK[b.status])
  }, [list, filter])

  return (
    <PermissionRequired
      permission={ProductionPermissions.read}
      title="İş Emirleri"
      onBack={nav.canGoBack ? nav.goBack : undefined}
    >
      <Screen
        header={{
          title: 'İş Emirleri',
          large: !nav.canGoBack,
          onBack: nav.canGoBack ? nav.goBack : undefined,
        }}
        onRefresh={workOrders.refetch}
        refreshing={workOrders.refreshing}
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
                    {s === 'all' ? 'Tümü' : WORK_ORDER_STATUS_LABELS[s]}
                  </Text>
                </Pressable>
              )
            })}
          </ScrollView>
        ) : null}

        {workOrders.loading ? (
          <SkeletonRows count={6} />
        ) : workOrders.error ? (
          <EmptyState
            icon="alert-triangle"
            tone="destructive"
            title="Yüklenemedi"
            description={workOrders.error}
            actionLabel="Tekrar dene"
            onAction={workOrders.refetch}
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="tool"
            title="İş emri bulunamadı"
            description={filter === 'all' ? 'Üretim emri onaylandığında iş emirleri oluşur.' : 'Bu durumda iş emri yok.'}
          />
        ) : (
          <>
            <Text variant="overline" tone="muted" style={{ paddingHorizontal: t.spacing[1] }}>
              {filtered.length} İş Emri
            </Text>
            <ListCard>
              {filtered.map((w) => (
                <ListRow
                  key={w.id}
                  icon={WO_STATUS_ICONS[w.status]}
                  iconTone={w.status === 'in_progress' || w.status === 'paused' || w.status === 'ready' ? 'primary' : 'muted'}
                  title={`${w.manufacturingOrderNo} · ${w.sequence}. ${w.name}`}
                  subtitle={`${w.workCenterName} · ${w.productName}`}
                  trailing={
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <Text style={{ fontWeight: 'bold', fontFamily: 'monospace' }}>
                        {formatQty(w.producedQuantity)}/{formatQty(w.plannedQuantity)} {w.unit}
                      </Text>
                      <Badge label={WORK_ORDER_STATUS_LABELS[w.status]} tone={WO_STATUS_TONES[w.status]} />
                    </View>
                  }
                  onPress={() => nav.navigate('production.workorder.terminal', { id: w.id }, `${w.sequence}. ${w.name}`)}
                />
              ))}
            </ListCard>
          </>
        )}
      </Screen>
    </PermissionRequired>
  )
}
