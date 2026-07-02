// DocumentsStats — evrak dashboard statistics (Panel tab body): toplam evrak,
// süresi yaklaşan, süresi dolmuş. Gated by documents.documents.read.

import * as React from 'react'
import { View } from 'react-native'

import { DocumentsPermissions } from '@turbohesap/shared'

import { Section, StatCard } from '../../components'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth/auth-context'
import { useAsync } from '../../lib/use-async'
import { useTheme } from '../../theme/theme-context'

export function DocumentsStats() {
  const t = useTheme()
  const { hasPermission } = useAuth()
  const canRead = hasPermission(DocumentsPermissions.documentsRead)
  const docs = useAsync(() => api.documents.documents.list(), [], { enabled: canRead })

  if (!canRead) return null

  const list = docs.data ?? []
  const expiringSoon = list.filter((d) => d.expiryStatus === 'expiring_soon').length
  const expired = list.filter((d) => d.expiryStatus === 'expired').length

  return (
    <Section title="Evrak Özetleri">
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing[3] }}>
        <Cell><StatCard icon="file-text" tone="primary" label="Toplam evrak" value={String(list.length)} /></Cell>
        <Cell><StatCard icon="clock" tone="warning" label="Süresi yaklaşan" value={String(expiringSoon)} /></Cell>
        <Cell><StatCard icon="alert-triangle" tone="warning" label="Süresi dolmuş" value={String(expired)} /></Cell>
      </View>
    </Section>
  )
}

function Cell({ children }: { children: React.ReactNode }) {
  return <View style={{ width: '47%', flexGrow: 1, flexDirection: 'row' }}>{children}</View>
}
