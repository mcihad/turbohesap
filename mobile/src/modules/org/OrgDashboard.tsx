// Organization dashboard body (mobile) — stats, branch types, cities, recent.

import * as React from 'react'

import { OrgPermissions } from '@turbohesap/shared'

import { ChartCard, type Datum, MiniBarChart, RecentCard, SegmentBar } from '../../components'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth/auth-context'
import { useAsync } from '../../lib/use-async'
import { useNav } from '../../navigation/nav-context'
import { branchTypeLabel } from './labels'
import { OrgStats } from './OrgStats'

function tally(items: string[]): Datum[] {
  const m = new Map<string, number>()
  for (const k of items) m.set(k, (m.get(k) ?? 0) + 1)
  return [...m.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
}

export function OrgDashboard() {
  const nav = useNav()
  const { hasPermission } = useAuth()
  const branches = useAsync(() => api.org.branches.list(), [], {
    enabled: hasPermission(OrgPermissions.branchesRead),
  })
  const list = branches.data ?? []
  const typeData = tally(list.map((b) => branchTypeLabel(b.type)))
  const cityData = tally(list.map((b) => b.city).filter(Boolean)).slice(0, 6)
  const recent = [...list]
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    .slice(0, 5)
    .map((b) => ({ id: b.id, title: b.name, subtitle: `${b.code}${b.city ? ` · ${b.city}` : ''}`, at: b.createdAt, onPress: () => nav.navigate('org.branches.detail', { id: b.id }, b.name) }))

  return (
    <>
      <OrgStats />
      <ChartCard title="Şube türleri" subtitle="Türe göre dağılım" isEmpty={typeData.length === 0}>
        <SegmentBar data={typeData} />
      </ChartCard>
      <ChartCard title="Şehirlere göre şube" subtitle="En çok şube olan şehirler" isEmpty={cityData.length === 0}>
        <MiniBarChart data={cityData} />
      </ChartCard>
      <RecentCard title="Son eklenen şubeler" icon="map-pin" items={recent} emptyText="Henüz şube yok" />
    </>
  )
}
