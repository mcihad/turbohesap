// IAM dashboard body (mobile) — stats, active/passive, users per role, recent.

import * as React from 'react'

import { IamPermissions } from '@turbohesap/shared'

import { ChartCard, type Datum, MiniBarChart, RecentCard, Section, SegmentBar } from '../../components'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth/auth-context'
import { useAsync } from '../../lib/use-async'
import { useNav } from '../../navigation/nav-context'
import { IamStats } from './IamStats'

export function IamDashboard() {
  const nav = useNav()
  const { hasPermission } = useAuth()
  const users = useAsync(() => api.iam.users.list(), [], { enabled: hasPermission(IamPermissions.usersRead) })
  const list = users.data ?? []
  const active = list.filter((u) => u.isActive).length

  const statusData: Datum[] = [
    { name: 'Aktif', value: active },
    { name: 'Pasif', value: list.length - active },
  ].filter((d) => d.value > 0)
  const perRole = new Map<string, number>()
  for (const u of list) for (const r of u.roles) perRole.set(r.name, (perRole.get(r.name) ?? 0) + 1)
  const roleData: Datum[] = [...perRole.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 6)
  const recent = [...list]
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    .slice(0, 5)
    .map((u) => ({ id: u.id, title: `${u.firstName} ${u.lastName}`.trim() || u.username, subtitle: u.email, at: u.createdAt, onPress: () => nav.navigate('iam.users.detail', { id: u.id }, u.username) }))

  return (
    <>
      <IamStats />
      
      <Section title="Grafikler & Dağılım">
        <ChartCard title="Kullanıcı durumu" subtitle="Aktif / pasif" isEmpty={statusData.length === 0}>
          <SegmentBar data={statusData} />
        </ChartCard>
        
        <ChartCard title="Rol başına kullanıcı" subtitle="En çok kullanılan roller" isEmpty={roleData.length === 0}>
          <MiniBarChart data={roleData} />
        </ChartCard>
      </Section>

      <RecentCard title="Son eklenen kullanıcılar" icon="users" items={recent} emptyText="Henüz kullanıcı yok" />
    </>
  )
}
