// Lookups dashboard statistics — number of lists, total items, biggest list.

import { useQuery } from '@tanstack/react-query'
import { Hash, Layers, List, ListChecks } from 'lucide-react'

import { LookupsPermissions } from '@turbohesap/shared'

import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth/auth-context'
import { StatGrid, StatTile } from '@/components/layout/stat-tile'

export function LookupsStats() {
  const { hasPermission } = useAuth()
  const query = useQuery({
    queryKey: ['lookups', 'lists'],
    queryFn: () => api.lookups.lists(),
    enabled: hasPermission(LookupsPermissions.read),
  })
  const lists = query.data ?? []
  const totalItems = lists.reduce((s, l) => s + l.count, 0)
  const biggest = lists.reduce<{ list: string; count: number } | null>(
    (max, l) => (!max || l.count > max.count ? l : max),
    null,
  )
  const loading = query.isLoading

  return (
    <StatGrid>
      <StatTile icon={ListChecks} tone="primary" label="Liste" value={lists.length} loading={loading} />
      <StatTile icon={Hash} tone="info" label="Toplam öğe" value={totalItems} loading={loading} />
      <StatTile icon={Layers} tone="success" label="En büyük liste" value={biggest ? biggest.list : '—'} hint={biggest ? `${biggest.count} öğe` : undefined} loading={loading} />
      <StatTile icon={List} tone="muted" label="Ort. öğe/liste" value={lists.length ? Math.round(totalItems / lists.length) : 0} loading={loading} />
    </StatGrid>
  )
}
