// Organization dashboard statistics — branches, active/passive, cities, HQ.

import { useQuery } from '@tanstack/react-query'
import { Building2, CheckCircle2, MapPin, XCircle } from 'lucide-react'

import { OrgPermissions } from '@turbohesap/shared'

import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth/auth-context'
import { StatGrid, StatTile } from '@/components/layout/stat-tile'

export function OrgStats() {
  const { hasPermission } = useAuth()
  const query = useQuery({
    queryKey: ['org', 'branches'],
    queryFn: () => api.org.branches.list(),
    enabled: hasPermission(OrgPermissions.branchesRead),
  })
  const branches = query.data ?? []
  const active = branches.filter((b) => b.isActive).length
  const cities = new Set(branches.map((b) => b.city).filter(Boolean)).size
  const loading = query.isLoading

  return (
    <StatGrid>
      <StatTile icon={Building2} tone="primary" label="Şube" value={branches.length} loading={loading} />
      <StatTile icon={CheckCircle2} tone="success" label="Aktif" value={active} loading={loading} />
      <StatTile icon={XCircle} tone="muted" label="Pasif" value={branches.length - active} loading={loading} />
      <StatTile icon={MapPin} tone="info" label="Şehir" value={cities} loading={loading} />
    </StatGrid>
  )
}
