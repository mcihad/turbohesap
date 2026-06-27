// Lookups dashboard body (mobile) — stats, items-per-list bar, recent values.

import * as React from 'react'

import { LookupsPermissions } from '@turbohesap/shared'

import { ChartCard, type Datum, MiniBarChart, RecentCard } from '../../components'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth/auth-context'
import { useAsync } from '../../lib/use-async'
import { useNav } from '../../navigation/nav-context'
import { LookupsStats } from './LookupsStats'

export function LookupsDashboard() {
  const nav = useNav()
  const { hasPermission } = useAuth()
  const canRead = hasPermission(LookupsPermissions.read)
  const lists = useAsync(() => api.lookups.lists(), [], { enabled: canRead })
  const items = useAsync(() => api.lookups.list(), [], { enabled: canRead })

  const perList: Datum[] = (lists.data ?? [])
    .map((l) => ({ name: l.list, value: l.count }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8)
  const recent = [...(items.data ?? [])]
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    .slice(0, 5)
    .map((i) => ({ id: i.id, title: i.value, subtitle: `${i.list} · ${i.key}`, at: i.createdAt, onPress: () => nav.navigate('lookups.list', { list: i.list }, i.list) }))

  return (
    <>
      <LookupsStats />
      <ChartCard title="Liste başına öğe" subtitle="Her listedeki öğe sayısı" isEmpty={perList.length === 0}>
        <MiniBarChart data={perList} />
      </ChartCard>
      <RecentCard title="Son eklenen değerler" icon="list" items={recent} emptyText="Henüz değer yok" />
    </>
  )
}
