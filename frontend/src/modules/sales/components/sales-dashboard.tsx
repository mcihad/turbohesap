// Sales dashboard body — stats, channel-type distribution, commission rates, and
// the most-recently-added channels.

import { useQuery } from '@tanstack/react-query'
import { Store } from 'lucide-react'

import { SalesPermissions } from '@turbohesap/shared'

import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth/auth-context'
import { ChartCard } from '@/components/dashboard/chart-card'
import { RecentTable, type RecentRow } from '@/components/dashboard/recent-table'
import { barOption, type Datum, donutOption } from '@/components/dashboard/echart'
import { SALES_CHANNEL_TYPE_LABELS } from '../labels'
import { SalesStats } from './sales-stats'

export function SalesDashboard() {
  const { hasPermission } = useAuth()
  const query = useQuery({
    queryKey: ['sales', 'channels'],
    queryFn: () => api.sales.channels.list(),
    enabled: hasPermission(SalesPermissions.channelsRead),
  })
  const channels = query.data ?? []

  const byType = new Map<string, number>()
  for (const c of channels) {
    const k = SALES_CHANNEL_TYPE_LABELS[c.type] ?? c.type
    byType.set(k, (byType.get(k) ?? 0) + 1)
  }
  const typeData: Datum[] = [...byType.entries()].map(([name, value]) => ({ name, value }))
  const commission: Datum[] = channels
    .filter((c) => c.commissionRate != null && c.commissionRate > 0)
    .map((c) => ({ name: c.code, value: c.commissionRate as number }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8)

  const recent: RecentRow[] = [...channels]
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    .slice(0, 6)
    .map((c) => ({ id: c.id, name: c.name, sub: c.code, value: c.commissionRate != null ? `%${c.commissionRate}` : '—', at: c.createdAt, to: '/sales/channels/$id', params: { id: c.id } }))

  return (
    <>
      <SalesStats />
      <div className="grid gap-3 lg:grid-cols-2">
        <ChartCard title="Kanal türleri" subtitle="Türe göre dağılım" option={donutOption(typeData, 'Kanal')} loading={query.isLoading} isEmpty={typeData.length === 0} />
        <ChartCard title="Komisyon oranları" subtitle="Kanal başına %" option={barOption(commission, { horizontal: true })} loading={query.isLoading} isEmpty={commission.length === 0} emptyText="Komisyonlu kanal yok" />
      </div>
      <RecentTable title="Son eklenen kanallar" icon={Store} valueHeader="Komisyon" rows={recent} loading={query.isLoading} emptyText="Henüz kanal yok" />
    </>
  )
}
