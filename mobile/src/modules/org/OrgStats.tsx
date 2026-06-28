// Organization dashboard statistics (mobile) — branches, active, passive, cities.

import * as React from 'react'
import { View } from 'react-native'

import { OrgPermissions } from '@turbohesap/shared'

import { Section, StatCard } from '../../components'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth/auth-context'
import { useAsync } from '../../lib/use-async'
import { useTheme } from '../../theme/theme-context'

export function OrgStats() {
  const t = useTheme()
  const { hasPermission } = useAuth()
  const branches = useAsync(() => api.org.branches.list(), [], {
    enabled: hasPermission(OrgPermissions.branchesRead),
  })
  const list = branches.data ?? []
  const active = list.filter((b) => b.isActive).length
  const cities = new Set(list.map((b) => b.city).filter(Boolean)).size

  return (
    <Section title="Şube Özetleri">
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing[3] }}>
        <Cell><StatCard icon="briefcase" tone="primary" label="Şube" value={String(list.length)} /></Cell>
        <Cell><StatCard icon="check-circle" tone="success" label="Aktif" value={String(active)} /></Cell>
        <Cell><StatCard icon="x-circle" tone="warning" label="Pasif" value={String(list.length - active)} /></Cell>
        <Cell><StatCard icon="map-pin" tone="info" label="Şehir" value={String(cities)} /></Cell>
      </View>
    </Section>
  )
}

function Cell({ children }: { children: React.ReactNode }) {
  return <View style={{ width: '47%', flexGrow: 1, flexDirection: 'row' }}>{children}</View>
}
