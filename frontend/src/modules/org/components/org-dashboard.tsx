// Organization dashboard body — stats, branch-type distribution, branches per
// city, and the most-recently-added branches.

import { useQuery } from '@tanstack/react-query'
import { Building2 } from 'lucide-react'

import { OrgPermissions } from '@turbohesap/shared'

import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth/auth-context'
import { ChartCard } from '@/components/dashboard/chart-card'
import { RecentTable, type RecentRow } from '@/components/dashboard/recent-table'
import { barOption, type Datum, donutOption } from '@/components/dashboard/echart'
import { BRANCH_TYPE_LABELS } from '../labels'
import { OrgStats } from './org-stats'

function tally(items: string[]): Datum[] {
  const m = new Map<string, number>()
  for (const k of items) m.set(k, (m.get(k) ?? 0) + 1)
  return [...m.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
}

export function OrgDashboard() {
  const { hasPermission } = useAuth()
  const query = useQuery({
    queryKey: ['org', 'branches'],
    queryFn: () => api.org.branches.list(),
    enabled: hasPermission(OrgPermissions.branchesRead),
  })
  const branches = query.data ?? []

  const typeData = tally(branches.map((b) => BRANCH_TYPE_LABELS[b.type] ?? b.type))
  const cityData = tally(branches.map((b) => b.city).filter(Boolean)).slice(0, 8)

  const recent: RecentRow[] = [...branches]
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    .slice(0, 6)
    .map((b) => ({ id: b.id, name: b.name, sub: `${b.code}${b.city ? ` · ${b.city}` : ''}`, at: b.createdAt, to: '/org/branches/$id', params: { id: b.id } }))

  return (
    <>
      <OrgStats />
      <div className="grid gap-3 lg:grid-cols-2">
        <ChartCard title="Şube türleri" subtitle="Türe göre dağılım" option={donutOption(typeData, 'Şube')} loading={query.isLoading} isEmpty={typeData.length === 0} />
        <ChartCard title="Şehirlere göre şube" subtitle="En çok şube olan şehirler" option={barOption(cityData, { horizontal: true })} loading={query.isLoading} isEmpty={cityData.length === 0} />
      </div>
      <RecentTable title="Son eklenen şubeler" icon={Building2} rows={recent} loading={query.isLoading} emptyText="Henüz şube yok" />
    </>
  )
}
