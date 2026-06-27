// Sales dashboard statistics — channels, active/passive, default channel.

import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, Star, Store, XCircle } from 'lucide-react'

import { SalesPermissions } from '@turbohesap/shared'

import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth/auth-context'
import { StatGrid, StatTile } from '@/components/layout/stat-tile'

export function SalesStats() {
  const { hasPermission } = useAuth()
  const query = useQuery({
    queryKey: ['sales', 'channels'],
    queryFn: () => api.sales.channels.list(),
    enabled: hasPermission(SalesPermissions.channelsRead),
  })
  const channels = query.data ?? []
  const active = channels.filter((c) => c.isActive).length
  const def = channels.find((c) => c.isDefault)
  const loading = query.isLoading

  return (
    <StatGrid>
      <StatTile icon={Store} tone="primary" label="Satış kanalı" value={channels.length} loading={loading} />
      <StatTile icon={CheckCircle2} tone="success" label="Aktif" value={active} loading={loading} />
      <StatTile icon={XCircle} tone="muted" label="Pasif" value={channels.length - active} loading={loading} />
      <StatTile icon={Star} tone="info" label="Varsayılan" value={def ? def.code : '—'} loading={loading} />
    </StatGrid>
  )
}
