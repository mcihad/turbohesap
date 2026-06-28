// Fatura (invoices) dashboard — stats, a type/status distribution chart, and a
// recent-invoices table. Mirrors the contacts dashboard shape.

import { useQuery } from '@tanstack/react-query'
import { FileText, FileWarning, TrendingDown, TrendingUp } from 'lucide-react'

import { InvoicesPermissions, type InvoiceType } from '@turbohesap/shared'

import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth/auth-context'
import { StatGrid, StatTile } from '@/components/layout/stat-tile'
import { ChartCard } from '@/components/dashboard/chart-card'
import { RecentTable, type RecentRow } from '@/components/dashboard/recent-table'
import { type Datum, donutOption } from '@/components/dashboard/echart'
import { formatMoney } from '../format'

const TYPE_LABEL: Record<InvoiceType, string> = {
  sales: 'Satış',
  purchase: 'Alış',
  return: 'İade',
}

export function InvoicesDashboard() {
  const { hasPermission } = useAuth()
  const canRead = hasPermission(InvoicesPermissions.read)

  const invoicesQuery = useQuery({
    queryKey: ['invoices', 'list'],
    queryFn: () => api.invoices.list(),
    enabled: canRead,
  })

  const list = invoicesQuery.data ?? []
  const loading = invoicesQuery.isLoading

  const isPosted = (s: string) => s === 'issued' || s === 'paid'
  const salesTotal = sum(
    list.filter((i) => i.type === 'sales' && isPosted(i.status)).map((i) => i.grandTotal),
  )
  const purchaseTotal = sum(
    list.filter((i) => i.type === 'purchase' && isPosted(i.status)).map((i) => i.grandTotal),
  )
  const draftCount = list.filter((i) => i.status === 'draft').length

  const byType: Datum[] = Object.entries(
    list.reduce<Record<string, number>>((m, i) => ({ ...m, [i.type]: (m[i.type] ?? 0) + 1 }), {}),
  ).map(([k, v]) => ({ name: TYPE_LABEL[k as InvoiceType] ?? k, value: v }))

  const recent: RecentRow[] = [...list]
    .sort((a, b) => +new Date(b.date) - +new Date(a.date))
    .slice(0, 6)
    .map((i) => ({
      id: i.id,
      name: i.number ? `${i.series}${i.number}` : '— (taslak)',
      sub: i.contact?.name ?? undefined,
      value: formatMoney(i.grandTotal, i.currencyCode),
      at: i.date,
      to: '/invoices/invoices/$id',
      params: { id: i.id },
    }))

  return (
    <>
      <StatGrid>
        <StatTile
          icon={FileText}
          tone="primary"
          label="Fatura sayısı"
          value={list.length}
          loading={loading}
        />
        <StatTile
          icon={TrendingUp}
          tone="success"
          label="Satış toplamı"
          value={formatMoney(salesTotal)}
          loading={loading}
        />
        <StatTile
          icon={TrendingDown}
          tone="warning"
          label="Alış toplamı"
          value={formatMoney(purchaseTotal)}
          loading={loading}
        />
        <StatTile
          icon={FileWarning}
          tone="info"
          label="Taslak"
          value={draftCount}
          loading={loading}
        />
      </StatGrid>

      <div className="grid gap-3 lg:grid-cols-2">
        <ChartCard
          title="Fatura dağılımı"
          subtitle="Tipe göre"
          option={donutOption(byType, 'Fatura')}
          loading={loading}
          isEmpty={byType.length === 0}
        />
        <RecentTable
          title="Son faturalar"
          icon={FileText}
          valueHeader="Genel Toplam"
          rows={recent}
          loading={loading}
          emptyText="Henüz fatura yok"
        />
      </div>
    </>
  )
}

function sum(xs: number[]): number {
  return xs.reduce((s, x) => s + x, 0)
}
