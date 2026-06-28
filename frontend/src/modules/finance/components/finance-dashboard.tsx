import { useQuery } from '@tanstack/react-query'
import { Wallet } from 'lucide-react'
import { FinancePermissions } from '@turbohesap/shared'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth/auth-context'
import { ChartCard } from '@/components/dashboard/chart-card'
import { RecentTable, type RecentRow } from '@/components/dashboard/recent-table'
import { donutOption, type Datum } from '@/components/dashboard/echart'
import { FinanceStats } from './finance-stats'
import { formatMoney } from '../pages/cash-accounts-page'

export function FinanceDashboard() {
  const { hasPermission } = useAuth()

  const cashQuery = useQuery({
    queryKey: ['finance', 'cash-accounts'],
    queryFn: () => api.finance.cashAccounts.list(),
    enabled: hasPermission(FinancePermissions.cashAccountsRead),
  })

  const bankQuery = useQuery({
    queryKey: ['finance', 'bank-accounts'],
    queryFn: () => api.finance.bankAccounts.list(),
    enabled: hasPermission(FinancePermissions.bankAccountsRead),
  })

  const cashList = cashQuery.data ?? []
  const bankList = bankQuery.data ?? []

  const distributionData: Datum[] = [
    { name: 'Kasa Hesapları', value: cashList.length },
    { name: 'Banka Hesapları', value: bankList.length },
  ].filter((d) => d.value > 0)

  // Chart data: distribution of cash balance vs bank balance
  const totalCashBalance = cashList.reduce((acc, ca) => acc + ca.balance, 0)
  const totalBankBalance = bankList.reduce((acc, ba) => acc + ba.balance, 0)
  const balanceData: Datum[] = [
    { name: 'Kasa Toplamı', value: Math.max(0, totalCashBalance) },
    { name: 'Banka Toplamı', value: Math.max(0, totalBankBalance) },
  ].filter((d) => d.value > 0)

  const recent: RecentRow[] = [
    ...cashList.map((ca) => ({
      id: ca.id,
      name: ca.name,
      sub: `Kasa · ${formatMoney(ca.balance, ca.currency)}`,
      at: ca.createdAt,
      to: '/finance/cash-accounts/$id' as const,
      params: { id: ca.id },
    })),
    ...bankList.map((ba) => ({
      id: ba.id,
      name: ba.name,
      sub: `${ba.bankName} · ${formatMoney(ba.balance, ba.currency)}`,
      at: ba.createdAt,
      to: '/finance/bank-accounts/$id' as const,
      params: { id: ba.id },
    })),
  ]
    .sort((a, b) => +new Date(b.at) - +new Date(a.at))
    .slice(0, 6)

  const loading = cashQuery.isLoading || bankQuery.isLoading

  return (
    <>
      <FinanceStats />
      <div className="grid gap-3 lg:grid-cols-2">
        <ChartCard
          title="Hesap Sayısı Dağılımı"
          subtitle="Hesap türlerine göre dağılım"
          option={donutOption(distributionData, 'Hesap Sayısı')}
          loading={loading}
          isEmpty={distributionData.length === 0}
        />
        <ChartCard
          title="Bakiye Dağılımı (TRY)"
          subtitle="Kasa ve Banka toplam bakiyeleri"
          option={donutOption(balanceData, 'Toplam Bakiye')}
          loading={loading}
          isEmpty={balanceData.length === 0}
        />
      </div>
      <RecentTable
        title="Son Tanımlanan Hesaplar"
        icon={Wallet}
        rows={recent}
        loading={loading}
        emptyText="Henüz tanımlı kasa veya banka hesabı yok"
      />
    </>
  )
}
