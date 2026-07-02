// Evrak dashboard — stats, charts (category distribution + expiry breakdown)
// and a recent-documents table. Mirrors `inventory/components/inventory-dashboard.tsx`.

import { useQuery } from '@tanstack/react-query'
import { FileStack } from 'lucide-react'

import { DocumentsPermissions } from '@turbohesap/shared'

import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth/auth-context'
import { ChartCard } from '@/components/dashboard/chart-card'
import { RecentTable, type RecentRow } from '@/components/dashboard/recent-table'
import { donutOption, type Datum } from '@/components/dashboard/echart'
import { expiryStatusLabel } from '../labels'
import { DocumentsStats } from './documents-stats'

function groupBy<T>(items: T[], key: (i: T) => string): Datum[] {
  const m = new Map<string, number>()
  for (const it of items) m.set(key(it), (m.get(key(it)) ?? 0) + 1)
  return [...m.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
}

export function DocumentsDashboard() {
  const { hasPermission } = useAuth()
  const docsQuery = useQuery({
    queryKey: ['documents', 'documents'],
    queryFn: () => api.documents.documents.list(),
    enabled: hasPermission(DocumentsPermissions.documentsRead),
  })

  const list = docsQuery.data ?? []
  const byCategory = groupBy(list, (d) => d.categoryName ?? 'Kategorisiz').slice(0, 7)
  const byExpiry = groupBy(list, (d) => expiryStatusLabel(d.expiryStatus))

  const recent: RecentRow[] = [...list]
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    .slice(0, 6)
    .map((d) => ({
      id: d.id,
      name: d.title,
      sub: [d.code, d.categoryName].filter(Boolean).join(' · '),
      value: expiryStatusLabel(d.expiryStatus),
      at: d.createdAt,
    }))

  return (
    <>
      <DocumentsStats />
      <div className="grid gap-3 lg:grid-cols-2">
        <ChartCard title="Kategoriye göre evrak" subtitle="Kategori dağılımı" option={donutOption(byCategory, 'Evrak')} loading={docsQuery.isLoading} isEmpty={byCategory.length === 0} />
        <ChartCard title="Geçerlilik durumu" subtitle="Süreli evrak durumlarının dağılımı" option={donutOption(byExpiry, 'Evrak')} loading={docsQuery.isLoading} isEmpty={byExpiry.length === 0} />
      </div>
      <RecentTable title="Son eklenen evraklar" icon={FileStack} valueHeader="Durum" rows={recent} loading={docsQuery.isLoading} emptyText="Henüz evrak yok" />
    </>
  )
}
