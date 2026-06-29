// Sayım (stocktake) dashboard — stats, a kind distribution donut, and a
// recent-counts table. Mirrors the orders dashboard shape.

import { useQuery } from '@tanstack/react-query'
import { ClipboardCheck, ClipboardList, ScanLine, TriangleAlert } from 'lucide-react'

import {
  STOCK_COUNT_KIND_LABELS,
  StocktakePermissions,
  type StockCountKind,
} from '@turbohesap/shared'

import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth/auth-context'
import { StatGrid, StatTile } from '@/components/layout/stat-tile'
import { ChartCard } from '@/components/dashboard/chart-card'
import { RecentTable, type RecentRow } from '@/components/dashboard/recent-table'
import { type Datum, donutOption } from '@/components/dashboard/echart'

export function StocktakeDashboard() {
  const { hasPermission } = useAuth()
  const canRead = hasPermission(StocktakePermissions.read)

  const listQuery = useQuery({
    queryKey: ['stocktake', 'list'],
    queryFn: () => api.stocktake.list(),
    enabled: canRead,
  })

  const list = listQuery.data ?? []
  const loading = listQuery.isLoading

  const activeCount = list.filter((c) => c.status === 'counting').length
  const reviewCount = list.filter((c) => c.status === 'review').length
  const varianceTotal = list.reduce((sum, c) => sum + c.varianceCount, 0)

  const byKind: Datum[] = Object.entries(
    list.reduce<Record<string, number>>((m, c) => ({ ...m, [c.kind]: (m[c.kind] ?? 0) + 1 }), {}),
  ).map(([k, v]) => ({ name: STOCK_COUNT_KIND_LABELS[k as StockCountKind] ?? k, value: v }))

  const recent: RecentRow[] = [...list]
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    .slice(0, 6)
    .map((c) => ({
      id: c.id,
      name: c.name || '— (adsız)',
      sub: c.branchName || undefined,
      value: `${c.countedCount}/${c.lineCount}`,
      at: c.plannedDate || c.createdAt,
      to: '/stocktake/$id',
      params: { id: c.id },
    }))

  return (
    <>
      <StatGrid>
        <StatTile icon={ClipboardCheck} tone="primary" label="Toplam Sayım" value={list.length} loading={loading} />
        <StatTile icon={ScanLine} tone="info" label="Sayımda" value={activeCount} loading={loading} />
        <StatTile icon={ClipboardList} tone="warning" label="İncelemede" value={reviewCount} loading={loading} />
        <StatTile icon={TriangleAlert} tone="destructive" label="Toplam Fark" value={varianceTotal} loading={loading} />
      </StatGrid>

      <div className="grid gap-3 lg:grid-cols-2">
        <ChartCard
          title="Sayım dağılımı"
          subtitle="Türe göre"
          option={donutOption(byKind, 'Sayım')}
          loading={loading}
          isEmpty={byKind.length === 0}
        />
        <RecentTable
          title="Son sayımlar"
          icon={ClipboardCheck}
          valueHeader="Sayılan/Satır"
          rows={recent}
          loading={loading}
          emptyText="Henüz sayım yok"
        />
      </div>
    </>
  )
}
