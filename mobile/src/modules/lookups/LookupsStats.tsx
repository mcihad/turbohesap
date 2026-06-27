// Lookups dashboard statistics (mobile) — lists, total items, biggest, average.

import * as React from 'react'
import { View } from 'react-native'

import { LookupsPermissions } from '@turbohesap/shared'

import { StatCard } from '../../components'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth/auth-context'
import { useAsync } from '../../lib/use-async'
import { useTheme } from '../../theme/theme-context'

export function LookupsStats() {
  const t = useTheme()
  const { hasPermission } = useAuth()
  const lists = useAsync(() => api.lookups.lists(), [], {
    enabled: hasPermission(LookupsPermissions.read),
  })
  const data = lists.data ?? []
  const total = data.reduce((s, l) => s + l.count, 0)
  const biggest = data.reduce<{ list: string; count: number } | null>(
    (max, l) => (!max || l.count > max.count ? l : max),
    null,
  )

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing[3] }}>
      <Cell><StatCard icon="list" tone="primary" label="Liste" value={String(data.length)} /></Cell>
      <Cell><StatCard icon="hash" tone="info" label="Toplam öğe" value={String(total)} /></Cell>
      <Cell><StatCard icon="layers" tone="success" label="En büyük" value={biggest ? biggest.list : '—'} /></Cell>
      <Cell><StatCard icon="bar-chart-2" tone="warning" label="Ort. öğe" value={String(data.length ? Math.round(total / data.length) : 0)} /></Cell>
    </View>
  )
}

function Cell({ children }: { children: React.ReactNode }) {
  return <View style={{ width: '47%', flexGrow: 1, flexDirection: 'row' }}>{children}</View>
}
