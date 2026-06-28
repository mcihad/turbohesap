import * as React from 'react'
import { View } from 'react-native'
import { FinancePermissions } from '@turbohesap/shared'
import { StatCard } from '../../components'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth/auth-context'
import { useAsync } from '../../lib/use-async'
import { useTheme } from '../../theme/theme-context'
import { formatMoney } from './CashAccountsScreen'

export function FinanceStats() {
  const t = useTheme()
  const { hasPermission } = useAuth()
  
  const cashAccounts = useAsync(() => api.finance.cashAccounts.list(), [], {
    enabled: hasPermission(FinancePermissions.cashAccountsRead),
  })
  
  const bankAccounts = useAsync(() => api.finance.bankAccounts.list(), [], {
    enabled: hasPermission(FinancePermissions.bankAccountsRead),
  })

  const cashList = cashAccounts.data ?? []
  const bankList = bankAccounts.data ?? []

  const totalCashBalance = cashList.reduce((acc, ca) => acc + ca.balance, 0)
  const totalBankBalance = bankList.reduce((acc, ba) => acc + ba.balance, 0)

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing[3] }}>
      <Cell>
        <StatCard
          icon="credit-card"
          tone="primary"
          label="Kasa Hesabı"
          value={String(cashList.length)}
        />
      </Cell>
      <Cell>
        <StatCard
          icon="briefcase"
          tone="info"
          label="Banka Hesabı"
          value={String(bankList.length)}
        />
      </Cell>
      <Cell>
        <StatCard
          icon="dollar-sign"
          tone="success"
          label="Kasa Toplamı"
          value={formatMoney(totalCashBalance, 'TRY')}
        />
      </Cell>
      <Cell>
        <StatCard
          icon="dollar-sign"
          tone="success"
          label="Banka Toplamı"
          value={formatMoney(totalBankBalance, 'TRY')}
        />
      </Cell>
    </View>
  )
}

function Cell({ children }: { children: React.ReactNode }) {
  return <View style={{ width: '47%', flexGrow: 1, flexDirection: 'row' }}>{children}</View>
}
