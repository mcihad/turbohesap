// IAM dashboard body — stats, active/passive donut, users-per-role bar, and the
// most-recently-added users.

import { useQuery } from '@tanstack/react-query'
import { Users } from 'lucide-react'

import { IamPermissions } from '@turbohesap/shared'

import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth/auth-context'
import { ChartCard } from '@/components/dashboard/chart-card'
import { RecentTable, type RecentRow } from '@/components/dashboard/recent-table'
import { barOption, type Datum, donutOption } from '@/components/dashboard/echart'
import { IamStats } from './iam-stats'

export function IamDashboard() {
  const { hasPermission } = useAuth()
  const canUsers = hasPermission(IamPermissions.usersRead)
  const usersQuery = useQuery({
    queryKey: ['iam', 'users'],
    queryFn: () => api.iam.users.list(),
    enabled: canUsers,
  })
  const users = usersQuery.data ?? []
  const active = users.filter((u) => u.isActive).length

  const statusData: Datum[] = [
    { name: 'Aktif', value: active },
    { name: 'Pasif', value: users.length - active },
  ].filter((d) => d.value > 0)

  const perRole = new Map<string, number>()
  for (const u of users) for (const r of u.roles) perRole.set(r.name, (perRole.get(r.name) ?? 0) + 1)
  const roleData: Datum[] = [...perRole.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8)

  const recent: RecentRow[] = [...users]
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    .slice(0, 6)
    .map((u) => ({ id: u.id, name: `${u.firstName} ${u.lastName}`.trim() || u.username, sub: u.email, value: u.isActive ? 'Aktif' : 'Pasif', at: u.createdAt, to: '/iam/users/$id', params: { id: u.id } }))

  return (
    <>
      <IamStats />
      <div className="grid gap-3 lg:grid-cols-2">
        <ChartCard title="Kullanıcı durumu" subtitle="Aktif / pasif dağılımı" option={donutOption(statusData, 'Kullanıcı')} loading={usersQuery.isLoading} isEmpty={statusData.length === 0} />
        <ChartCard title="Rol başına kullanıcı" subtitle="En çok kullanılan roller" option={barOption(roleData, { horizontal: true })} loading={usersQuery.isLoading} isEmpty={roleData.length === 0} />
      </div>
      <RecentTable title="Son eklenen kullanıcılar" icon={Users} valueHeader="Durum" rows={recent} loading={usersQuery.isLoading} emptyText="Henüz kullanıcı yok" />
    </>
  )
}
