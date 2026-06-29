// Siparişler (orders) dashboard — stats, a kind distribution donut, and a
// recent-documents table. Mirrors the invoices dashboard shape.

import { useQuery } from '@tanstack/react-query'
import { ClipboardList, FileText, PackageCheck, Truck } from 'lucide-react'

import { ORDER_KIND_LABELS, OrdersPermissions, type OrderKind } from '@turbohesap/shared'

import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth/auth-context'
import { StatGrid, StatTile } from '@/components/layout/stat-tile'
import { ChartCard } from '@/components/dashboard/chart-card'
import { RecentTable, type RecentRow } from '@/components/dashboard/recent-table'
import { type Datum, donutOption } from '@/components/dashboard/echart'
import { formatMoney } from '../format'

export function OrdersDashboard() {
  const { hasPermission } = useAuth()
  const canRead = hasPermission(OrdersPermissions.read)

  const ordersQuery = useQuery({
    queryKey: ['orders', 'list', 'all'],
    queryFn: () => api.orders.list(),
    enabled: canRead,
  })

  const list = ordersQuery.data ?? []
  const loading = ordersQuery.isLoading

  const countByKind = (kind: OrderKind) => list.filter((d) => d.kind === kind).length
  const draftCount = list.filter((d) => d.status === 'draft').length

  const byKind: Datum[] = Object.entries(
    list.reduce<Record<string, number>>((m, d) => ({ ...m, [d.kind]: (m[d.kind] ?? 0) + 1 }), {}),
  ).map(([k, v]) => ({ name: ORDER_KIND_LABELS[k as OrderKind] ?? k, value: v }))

  const recent: RecentRow[] = [...list]
    .sort((a, b) => +new Date(b.date) - +new Date(a.date))
    .slice(0, 6)
    .map((d) => ({
      id: d.id,
      name: d.number ? `${d.series}${d.number}` : '— (taslak)',
      sub: d.contactName || undefined,
      value: formatMoney(d.grandTotal, d.currencyCode),
      at: d.date,
      to: '/orders/$id',
      params: { id: d.id },
    }))

  return (
    <>
      <StatGrid>
        <StatTile icon={FileText} tone="primary" label="Teklifler" value={countByKind('quote')} loading={loading} />
        <StatTile icon={PackageCheck} tone="success" label="Siparişler" value={countByKind('order')} loading={loading} />
        <StatTile icon={Truck} tone="info" label="İrsaliyeler" value={countByKind('delivery')} loading={loading} />
        <StatTile icon={ClipboardList} tone="warning" label="Taslak" value={draftCount} loading={loading} />
      </StatGrid>

      <div className="grid gap-3 lg:grid-cols-2">
        <ChartCard
          title="Belge dağılımı"
          subtitle="Türe göre"
          option={donutOption(byKind, 'Belge')}
          loading={loading}
          isEmpty={byKind.length === 0}
        />
        <RecentTable
          title="Son belgeler"
          icon={ClipboardList}
          valueHeader="Genel Toplam"
          rows={recent}
          loading={loading}
          emptyText="Henüz belge yok"
        />
      </div>
    </>
  )
}
