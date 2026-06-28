import * as React from 'react'
import { View } from 'react-native'
import { FinancePermissions } from '@turbohesap/shared'
import {
  Badge,
  EmptyState,
  HeaderAction,
  Input,
  ListCard,
  ListRow,
  PermissionRequired,
  Screen,
  SkeletonRows,
  Text,
} from '../../components'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth/auth-context'
import { useAsync } from '../../lib/use-async'
import { useNav } from '../../navigation/nav-context'
import { useTheme } from '../../theme/theme-context'
import { formatMoney } from './CashAccountsScreen'

export function BankAccountsScreen() {
  const t = useTheme()
  const nav = useNav()
  const { hasPermission } = useAuth()
  const canRead = hasPermission(FinancePermissions.bankAccountsRead)
  const canWrite = hasPermission(FinancePermissions.bankAccountsWrite)
  const [query, setQuery] = React.useState('')
  const queryResult = useAsync(() => api.finance.bankAccounts.list(), [], { enabled: canRead })

  const filtered = React.useMemo(() => {
    const list = queryResult.data ?? []
    const q = query.trim().toLowerCase()
    if (!q) return list
    return list.filter((item) =>
      [item.name, item.bankName, item.iban, item.currency].some((f) => f?.toLowerCase().includes(q)),
    )
  }, [queryResult.data, query])

  return (
    <PermissionRequired permission={FinancePermissions.bankAccountsRead} title="Banka Hesapları" onBack={nav.canGoBack ? nav.goBack : undefined}>
      <Screen
        header={{
          title: 'Banka Hesapları',
          large: !nav.canGoBack,
          onBack: nav.canGoBack ? nav.goBack : undefined,
          right: canWrite ? (
            <HeaderAction icon="plus" onPress={() => nav.navigate('finance.bank-accounts.form', {}, 'Yeni Hesap')} />
          ) : undefined,
        }}
        onRefresh={queryResult.refetch}
        refreshing={queryResult.refreshing}
      >
        <Input icon="search" placeholder="Banka veya hesap adına göre ara" value={query} onChangeText={setQuery} />

        {queryResult.loading ? (
          <SkeletonRows count={6} />
        ) : queryResult.error ? (
          <EmptyState icon="alert-triangle" tone="destructive" title="Yüklenemedi" description={queryResult.error} actionLabel="Tekrar dene" onAction={queryResult.refetch} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="dollar-sign"
            title="Banka hesabı bulunamadı"
            description={query ? 'Eşleşen banka hesabı bulunamadı.' : 'Henüz banka hesabı eklenmemiş.'}
            actionLabel={canWrite && !query ? 'Yeni Hesap' : undefined}
            onAction={canWrite && !query ? () => nav.navigate('finance.bank-accounts.form', {}, 'Yeni Hesap') : undefined}
          />
        ) : (
          <>
            <Text variant="overline" tone="muted" style={{ paddingHorizontal: t.spacing[1] }}>
              {filtered.length} Banka Hesabı
            </Text>
            <ListCard>
              {filtered.map((item) => (
                <ListRow
                  key={item.id}
                  icon="briefcase"
                  title={item.name}
                  subtitle={`${item.bankName} · ${item.iban.substring(0, 8)}...`}
                  trailing={
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <Text style={{ fontWeight: 'bold', fontFamily: 'monospace' }}>
                        {formatMoney(item.balance, item.currency)}
                      </Text>
                      <Badge label={item.isActive ? 'Aktif' : 'Pasif'} tone={item.isActive ? 'success' : 'muted'} />
                    </View>
                  }
                  onPress={() => nav.navigate('finance.bank-accounts.detail', { id: item.id }, item.name)}
                />
              ))}
            </ListCard>
          </>
        )}
      </Screen>
    </PermissionRequired>
  )
}
