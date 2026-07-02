// Üretim panosu (mobile) — Üretim Emri durum dağılımı (stat kartları + segment
// bar), aktif iş emri sayısı ve son emirler. Quick actions: yeni emir + saha
// terminali. Rendered inside the generic ModuleDashboardScreen (which also shows
// the "Bölümler" quick-link grid below).

import * as React from 'react'
import { View } from 'react-native'
import {
  ProductionPermissions,
  type ProductionOrderStatus,
} from '@turbohesap/shared'
import {
  Button,
  ChartCard,
  type Datum,
  RecentCard,
  SegmentBar,
  Section,
  StatCard,
} from '../../components'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth/auth-context'
import { useAsync } from '../../lib/use-async'
import { useNav } from '../../navigation/nav-context'
import { useTheme } from '../../theme/theme-context'
import { PRODUCTION_ORDER_STATUS_LABELS } from './format'

export function ProductionDashboard() {
  const t = useTheme()
  const nav = useNav()
  const { hasPermission } = useAuth()
  const canRead = hasPermission(ProductionPermissions.read)
  const canWrite = hasPermission(ProductionPermissions.ordersWrite)

  const orders = useAsync(() => api.production.orders.list(), [], { enabled: canRead })
  const workOrders = useAsync(() => api.production.workOrders.list(), [], { enabled: canRead })

  const moList = orders.data ?? []
  const woList = workOrders.data ?? []

  const count = (s: ProductionOrderStatus) => moList.filter((o) => o.status === s).length
  const active = count('confirmed') + count('in_progress')
  const openWork = woList.filter((w) => w.status === 'ready' || w.status === 'in_progress' || w.status === 'paused').length

  const byStatus: Datum[] = (
    ['draft', 'confirmed', 'in_progress', 'done', 'cancelled'] as ProductionOrderStatus[]
  )
    .map((s) => ({ name: PRODUCTION_ORDER_STATUS_LABELS[s], value: count(s) }))
    .filter((d) => d.value > 0)

  const recent = [...moList]
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    .slice(0, 5)
    .map((o) => ({
      id: o.id,
      title: o.orderNo,
      subtitle: `${o.productName} · ${PRODUCTION_ORDER_STATUS_LABELS[o.status]}`,
      at: o.createdAt,
      onPress: () => nav.navigate('production.order.detail', { id: o.id }, o.orderNo),
    }))

  return (
    <>
      <View style={{ flexDirection: 'row', gap: t.spacing[3] }}>
        <StatCard icon="clipboard" label="Aktif Emir" value={String(active)} tone="primary" />
        <StatCard icon="activity" label="Üretimde" value={String(count('in_progress'))} tone="info" />
      </View>
      <View style={{ flexDirection: 'row', gap: t.spacing[3] }}>
        <StatCard icon="tool" label="Açık İş Emri" value={String(openWork)} tone="warning" />
        <StatCard icon="check-circle" label="Tamamlanan" value={String(count('done'))} tone="success" />
      </View>

      {canWrite ? (
        <View style={{ flexDirection: 'row', gap: t.spacing[3] }}>
          <View style={{ flex: 1 }}>
            <Button
              title="Yeni Emir"
              icon="plus"
              fullWidth
              onPress={() => nav.navigate('production.order.entry', {}, 'Yeni üretim emri')}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              title="Saha Terminali"
              icon="tool"
              variant="outline"
              fullWidth
              onPress={() => nav.switchTab('production.workorders')}
            />
          </View>
        </View>
      ) : null}

      <Section title="Durum Dağılımı">
        <ChartCard title="Üretim Emirleri" subtitle="Duruma göre" isEmpty={byStatus.length === 0}>
          <SegmentBar data={byStatus} />
        </ChartCard>
      </Section>

      <RecentCard title="Son üretim emirleri" icon="clipboard" items={recent} emptyText="Henüz üretim emri yok" />
    </>
  )
}
