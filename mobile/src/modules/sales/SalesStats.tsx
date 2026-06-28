// Sales dashboard statistics (mobile) — channels, active, passive, default.

import * as React from 'react'
import { View } from 'react-native'

import { SalesPermissions } from '@turbohesap/shared'

import { Section, StatCard } from '../../components'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth/auth-context'
import { useAsync } from '../../lib/use-async'
import { useTheme } from '../../theme/theme-context'

export function SalesStats() {
  const t = useTheme()
  const { hasPermission } = useAuth()
  const channels = useAsync(() => api.sales.channels.list(), [], {
    enabled: hasPermission(SalesPermissions.channelsRead),
  })
  const list = channels.data ?? []
  const active = list.filter((c) => c.isActive).length
  const def = list.find((c) => c.isDefault)

  return (
    <Section title="Kanal Özetleri">
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing[3] }}>
        <Cell><StatCard icon="shopping-bag" tone="primary" label="Kanal" value={String(list.length)} /></Cell>
        <Cell><StatCard icon="check-circle" tone="success" label="Aktif" value={String(active)} /></Cell>
        <Cell><StatCard icon="x-circle" tone="warning" label="Pasif" value={String(list.length - active)} /></Cell>
        <Cell><StatCard icon="star" tone="info" label="Varsayılan" value={def ? def.code : '—'} /></Cell>
      </View>
    </Section>
  )
}

function Cell({ children }: { children: React.ReactNode }) {
  return <View style={{ width: '47%', flexGrow: 1, flexDirection: 'row' }}>{children}</View>
}
