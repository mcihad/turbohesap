import * as React from 'react'
import { FinancePermissions } from '@turbohesap/shared'
import { ChartCard, RecentCard, SegmentBar } from '../../components'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth/auth-context'
import { useAsync } from '../../lib/use-async'
import { useNav } from '../../navigation/nav-context'
import { FinanceStats } from './FinanceStats'
import { formatMoney } from './CashAccountsScreen'

export function FinanceDashboard() {
  const nav = useNav()
  const { hasPermission } = useAuth()

  const cashAccounts = useAsync(() => api.finance.cashAccounts.list(), [], {
    enabled: hasPermission(FinancePermissions.cashAccountsRead),
  })

  const bankAccounts = useAsync(() => api.finance.bankAccounts.list(), [], {
    enabled: hasPermission(FinancePermissions.bankAccountsRead),
  })

  const cashList = cashAccounts.data ?? []
  const bankList = bankAccounts.data ?? []

  // Combine cash & bank accounts for the recent list
  const recentCash = cashList.map((ca) => ({
    id: ca.id,
    title: ca.name,
    subtitle: `Kasa · ${formatMoney(ca.balance, ca.currency)}`,
    at: ca.createdAt,
    onPress: () => nav.navigate('finance.cash-accounts.detail', { id: ca.id }, ca.name),
  }))

  const recentBank = bankList.map((ba) => ({
    id: ba.id,
    title: ba.name,
    subtitle: `${ba.bankName} · ${formatMoney(ba.balance, ba.currency)}`,
    at: ba.createdAt,
    onPress: () => nav.navigate('finance.bank-accounts.detail', { id: ba.id }, ba.name),
  }))

  const recent = [...recentCash, ...recentBank]
    .sort((a, b) => +new Date(b.at) - +new Date(a.at))
    .slice(0, 5)

  // Segment data: distribution of cash vs bank accounts
  const distributionData = [
    { name: 'Kasa Hesapları', value: cashList.length },
    { name: 'Banka Hesapları', value: bankList.length },
  ].filter((d) => d.value > 0)

  return (
    <>
      <FinanceStats />
      
      <ChartCard title="Hesap Dağılımı" subtitle="Hesap türlerine göre sayısal dağılım" isEmpty={distributionData.length === 0}>
        <SegmentBar data={distributionData} />
      </ChartCard>

      <RecentCard
        title="Son Tanımlanan Hesaplar"
        icon="credit-card"
        items={recent}
        emptyText="Henüz tanımlı kasa veya banka hesabı yok"
      />
    </>
  )
}
