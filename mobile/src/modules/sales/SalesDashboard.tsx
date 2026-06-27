// Sales dashboard body (mobile) — stats, channel types, commission, recent.

import * as React from 'react'

import { SalesPermissions } from '@turbohesap/shared'

import { ChartCard, type Datum, MiniBarChart, RecentCard, SegmentBar } from '../../components'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth/auth-context'
import { useAsync } from '../../lib/use-async'
import { useNav } from '../../navigation/nav-context'
import { salesChannelTypeLabel } from './labels'
import { SalesStats } from './SalesStats'

export function SalesDashboard() {
  const nav = useNav()
  const { hasPermission } = useAuth()
  const channels = useAsync(() => api.sales.channels.list(), [], {
    enabled: hasPermission(SalesPermissions.channelsRead),
  })
  const list = channels.data ?? []

  const byType = new Map<string, number>()
  for (const c of list) {
    const k = salesChannelTypeLabel(c.type)
    byType.set(k, (byType.get(k) ?? 0) + 1)
  }
  const typeData: Datum[] = [...byType.entries()].map(([name, value]) => ({ name, value }))
  const commission: Datum[] = list
    .filter((c) => c.commissionRate != null && c.commissionRate > 0)
    .map((c) => ({ name: c.code, value: c.commissionRate as number }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6)
  const recent = [...list]
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    .slice(0, 5)
    .map((c) => ({ id: c.id, title: c.name, subtitle: c.code, at: c.createdAt, onPress: () => nav.navigate('sales.channels.detail', { id: c.id }, c.name) }))

  return (
    <>
      <SalesStats />
      <ChartCard title="Kanal türleri" subtitle="Türe göre dağılım" isEmpty={typeData.length === 0}>
        <SegmentBar data={typeData} />
      </ChartCard>
      <ChartCard title="Komisyon oranları" subtitle="Kanal başına %" isEmpty={commission.length === 0} emptyText="Komisyonlu kanal yok">
        <MiniBarChart data={commission} format={(n) => `%${n}`} />
      </ChartCard>
      <RecentCard title="Son eklenen kanallar" icon="shopping-bag" items={recent} emptyText="Henüz kanal yok" />
    </>
  )
}
