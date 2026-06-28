// Cari (contacts) dashboard — stats, role distribution + top-balance charts, and
// a recent-contacts table. Mirrors the inventory dashboard shape.

import { useQuery } from '@tanstack/react-query'
import { Target, TrendingDown, TrendingUp, Users } from 'lucide-react'

import { ContactsPermissions } from '@turbohesap/shared'

import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth/auth-context'
import { StatGrid, StatTile } from '@/components/layout/stat-tile'
import { ChartCard } from '@/components/dashboard/chart-card'
import { RecentTable, type RecentRow } from '@/components/dashboard/recent-table'
import { barOption, type Datum, donutOption } from '@/components/dashboard/echart'
import { formatMoney } from '../format'

const ROLE_LABEL: Record<string, string> = {
  customer: 'Müşteri', supplier: 'Tedarikçi', both: 'Müşteri+Tedarikçi', lead: 'Aday',
}

export function ContactsDashboard() {
  const { hasPermission } = useAuth()
  const canRead = hasPermission(ContactsPermissions.contactsRead)
  const canOpps = hasPermission(ContactsPermissions.opportunitiesRead)

  const contactsQuery = useQuery({
    queryKey: ['contacts', 'contacts'],
    queryFn: () => api.contacts.contacts.list(),
    enabled: canRead,
  })
  const oppsQuery = useQuery({
    queryKey: ['contacts', 'opportunities', { openOnly: true }],
    queryFn: () => api.contacts.opportunities.list({ openOnly: true }),
    enabled: canOpps,
  })

  const list = contactsQuery.data ?? []
  const customers = list.filter((c) => c.role === 'customer' || c.role === 'both').length
  const suppliers = list.filter((c) => c.role === 'supplier' || c.role === 'both').length
  const receivable = sum(list.filter((c) => c.balanceSide === 'debit').map((c) => c.balance))
  const payable = sum(list.filter((c) => c.balanceSide === 'credit').map((c) => c.balance))
  const opps = oppsQuery.data ?? []
  const pipeline = sum(opps.map((o) => o.expectedRevenue))
  const loading = contactsQuery.isLoading

  const byRole: Datum[] = Object.entries(
    list.reduce<Record<string, number>>((m, c) => ({ ...m, [c.role]: (m[c.role] ?? 0) + 1 }), {}),
  ).map(([k, v]) => ({ name: ROLE_LABEL[k] ?? k, value: v }))

  const topBalances: Datum[] = [...list]
    .filter((c) => c.balance > 0)
    .sort((a, b) => b.balance - a.balance)
    .slice(0, 7)
    .map((c) => ({ name: c.name, value: c.balance }))

  const recent: RecentRow[] = [...list]
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    .slice(0, 6)
    .map((c) => ({
      id: c.id,
      name: c.name,
      sub: `${c.code} · ${ROLE_LABEL[c.role] ?? c.role}`,
      value: formatMoney(c.balance, c.currencyCode),
      at: c.createdAt,
    }))

  return (
    <>
      <StatGrid>
        <StatTile icon={Users} tone="primary" label="Cari" value={list.length} hint={`${list.filter((c) => c.isActive).length} aktif`} loading={loading} />
        <StatTile icon={TrendingUp} tone="success" label="Toplam alacak" value={formatMoney(receivable)} hint={`${customers} müşteri`} loading={loading} />
        <StatTile icon={TrendingDown} tone="warning" label="Toplam borç" value={formatMoney(payable)} hint={`${suppliers} tedarikçi`} loading={loading} />
        {canOpps ? (
          <StatTile icon={Target} tone="info" label="Açık fırsat" value={opps.length} hint={formatMoney(pipeline)} loading={oppsQuery.isLoading} />
        ) : null}
      </StatGrid>

      <div className="grid gap-3 lg:grid-cols-2">
        <ChartCard title="Cari dağılımı" subtitle="Role göre" option={donutOption(byRole, 'Cari')} loading={loading} isEmpty={byRole.length === 0} />
        <ChartCard title="En yüksek bakiyeler" subtitle="İlk 7 cari" option={barOption(topBalances, { horizontal: true })} loading={loading} isEmpty={topBalances.length === 0} />
      </div>

      <RecentTable title="Son eklenen cariler" icon={Users} valueHeader="Bakiye" rows={recent} loading={loading} emptyText="Henüz cari yok" />
    </>
  )
}

function sum(xs: number[]): number {
  return xs.reduce((s, x) => s + x, 0)
}
