import { useQuery } from '@tanstack/react-query'
import { Coins, Landmark, TrendingUp } from 'lucide-react'
import { FinancePermissions } from '@turbohesap/shared'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth/auth-context'
import { StatGrid, StatTile } from '@/components/layout/stat-tile'
import { formatMoney } from '../pages/cash-accounts-page'

export function FinanceStats() {
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

  const totalCashBalance = cashList.reduce((acc, ca) => acc + ca.balance, 0)
  const totalBankBalance = bankList.reduce((acc, ba) => acc + ba.balance, 0)
  const loading = cashQuery.isLoading || bankQuery.isLoading

  return (
    <StatGrid>
      <StatTile icon={Coins} tone="primary" label="Kasa Hesabı" value={cashList.length} loading={loading} />
      <StatTile icon={Landmark} tone="info" label="Banka Hesabı" value={bankList.length} loading={loading} />
      <StatTile icon={TrendingUp} tone="success" label="Kasa Toplamı" value={formatMoney(totalCashBalance, 'TRY')} loading={loading} />
      <StatTile icon={TrendingUp} tone="success" label="Banka Toplamı" value={formatMoney(totalBankBalance, 'TRY')} loading={loading} />
    </StatGrid>
  )
}
