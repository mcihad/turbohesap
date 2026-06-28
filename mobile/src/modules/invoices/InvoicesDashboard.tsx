import * as React from 'react'
import { View } from 'react-native'
import { InvoicesPermissions } from '@turbohesap/shared'
import { RecentCard, StatCard } from '../../components'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth/auth-context'
import { useAsync } from '../../lib/use-async'
import { useNav } from '../../navigation/nav-context'
import { useTheme } from '../../theme/theme-context'
import { formatMoney, TYPE_LABELS } from './format'

export function InvoicesDashboard() {
  const t = useTheme()
  const nav = useNav()
  const { hasPermission } = useAuth()

  const invoices = useAsync(() => api.invoices.list(), [], {
    enabled: hasPermission(InvoicesPermissions.read),
  })

  const list = invoices.data ?? []
  const posted = (status: string) => status === 'issued' || status === 'paid'

  const salesTotal = list
    .filter((i) => i.type === 'sales' && posted(i.status))
    .reduce((acc, i) => acc + i.grandTotal, 0)
  const purchaseTotal = list
    .filter((i) => i.type === 'purchase' && posted(i.status))
    .reduce((acc, i) => acc + i.grandTotal, 0)
  const draftCount = list.filter((i) => i.status === 'draft').length

  const recent = [...list]
    .sort((a, b) => +new Date(b.date) - +new Date(a.date))
    .slice(0, 5)
    .map((i) => ({
      id: i.id,
      title: `${i.number || 'Taslak'} · ${formatMoney(i.grandTotal, i.currencyCode)}`,
      subtitle: `${i.contact?.name ?? 'Cari yok'} · ${TYPE_LABELS[i.type]}`,
      onPress: () => nav.navigate('invoices.invoices.detail', { id: i.id }, i.number || 'Fatura'),
    }))

  return (
    <>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing[3] }}>
        <Cell>
          <StatCard icon="file-text" tone="primary" label="Fatura Sayısı" value={String(list.length)} />
        </Cell>
        <Cell>
          <StatCard icon="edit-3" tone="warning" label="Taslak" value={String(draftCount)} />
        </Cell>
        <Cell>
          <StatCard icon="arrow-up-right" tone="success" label="Satış Toplamı" value={formatMoney(salesTotal)} />
        </Cell>
        <Cell>
          <StatCard icon="arrow-down-left" tone="info" label="Alış Toplamı" value={formatMoney(purchaseTotal)} />
        </Cell>
      </View>

      <RecentCard
        title="Son Faturalar"
        icon="file-text"
        items={recent}
        emptyText="Henüz fatura oluşturulmamış"
      />
    </>
  )
}

function Cell({ children }: { children: React.ReactNode }) {
  return <View style={{ width: '47%', flexGrow: 1, flexDirection: 'row' }}>{children}</View>
}
