// Lookups dashboard body — stats, items-per-list bar chart, and the most-recently
// added lookup items.

import { useQuery } from '@tanstack/react-query'
import { ListChecks } from 'lucide-react'

import { LookupsPermissions } from '@turbohesap/shared'

import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth/auth-context'
import { ChartCard } from '@/components/dashboard/chart-card'
import { RecentTable, type RecentRow } from '@/components/dashboard/recent-table'
import { barOption, type Datum } from '@/components/dashboard/echart'
import { LookupsStats } from './lookups-stats'

export function LookupsDashboard() {
  const { hasPermission } = useAuth()
  const canRead = hasPermission(LookupsPermissions.read)
  const lists = useQuery({
    queryKey: ['lookups', 'lists'],
    queryFn: () => api.lookups.lists(),
    enabled: canRead,
  })
  const items = useQuery({
    queryKey: ['lookups', 'items', '__all__'],
    queryFn: () => api.lookups.list(),
    enabled: canRead,
  })

  const perList: Datum[] = (lists.data ?? [])
    .map((l) => ({ name: l.list, value: l.count }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10)

  const recent: RecentRow[] = [...(items.data ?? [])]
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    .slice(0, 6)
    .map((i) => ({ id: i.id, name: i.value, sub: `${i.list} · ${i.key}`, at: i.createdAt, to: '/lookups/items' }))

  return (
    <>
      <LookupsStats />
      <ChartCard
        title="Liste başına öğe"
        subtitle="Her tanım listesindeki öğe sayısı"
        option={barOption(perList, { horizontal: true })}
        height={Math.max(220, perList.length * 34)}
        loading={lists.isLoading}
        isEmpty={perList.length === 0}
      />
      <RecentTable title="Son eklenen değerler" icon={ListChecks} rows={recent} loading={items.isLoading} emptyText="Henüz değer yok" />
    </>
  )
}
