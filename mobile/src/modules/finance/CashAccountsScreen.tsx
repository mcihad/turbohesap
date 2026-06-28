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

export function formatMoney(val: number, currency: string = 'TRY'): string {
  try {
    const formatter = new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: currency,
    })
    return formatter.format(val)
  } catch {
    return `${val} ${currency}`
  }
}

export function CashAccountsScreen() {
  const t = useTheme()
  const nav = useNav()
  const { hasPermission } = useAuth()
  const canRead = hasPermission(FinancePermissions.cashAccountsRead)
  const canWrite = hasPermission(FinancePermissions.cashAccountsWrite)
  const [query, setQuery] = React.useState('')
  const queryResult = useAsync(() => api.finance.cashAccounts.list(), [], { enabled: canRead })

  const filtered = React.useMemo(() => {
    const list = queryResult.data ?? []
    const q = query.trim().toLowerCase()
    if (!q) return list
    return list.filter((item) =>
      [item.name, item.currency, item.description].some((f) => f?.toLowerCase().includes(q)),
    )
  }, [queryResult.data, query])

  return (
    <PermissionRequired permission={FinancePermissions.cashAccountsRead} title="Kasa Hesapları" onBack={nav.canGoBack ? nav.goBack : undefined}>
      <Screen
        header={{
          title: 'Kasa Hesapları',
          large: !nav.canGoBack,
          onBack: nav.canGoBack ? nav.goBack : undefined,
          right: canWrite ? (
            <HeaderAction icon="plus" onPress={() => nav.navigate('finance.cash-accounts.form', {}, 'Yeni Kasa')} />
          ) : undefined,
        }}
        onRefresh={queryResult.refetch}
        refreshing={queryResult.refreshing}
      >
        <Input icon="search" placeholder="Kasa adına göre ara" value={query} onChangeText={setQuery} />

        {queryResult.loading ? (
          <SkeletonRows count={6} />
        ) : queryResult.error ? (
          <EmptyState icon="alert-triangle" tone="destructive" title="Yüklenemedi" description={queryResult.error} actionLabel="Tekrar dene" onAction={queryResult.refetch} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="credit-card"
            title="Kasa bulunamadı"
            description={query ? 'Eşleşen kasa hesabı bulunamadı.' : 'Henüz kasa hesabı eklenmemiş.'}
            actionLabel={canWrite && !query ? 'Yeni Kasa' : undefined}
            onAction={canWrite && !query ? () => nav.navigate('finance.cash-accounts.form', {}, 'Yeni Kasa') : undefined}
          />
        ) : (
          <>
            <Text variant="overline" tone="muted" style={{ paddingHorizontal: t.spacing[1] }}>
              {filtered.length} Kasa Hesabı
            </Text>
            <ListCard>
              {filtered.map((item) => (
                <ListRow
                  key={item.id}
                  icon="credit-card"
                  title={item.name}
                  subtitle={item.description || 'Nakit Kasa Hesabı'}
                  trailing={
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <Text style={{ fontWeight: 'bold', fontFamily: 'monospace' }}>
                        {formatMoney(item.balance, item.currency)}
                      </Text>
                      <Badge label={item.isActive ? 'Aktif' : 'Pasif'} tone={item.isActive ? 'success' : 'muted'} />
                    </View>
                  }
                  onPress={() => nav.navigate('finance.cash-accounts.detail', { id: item.id }, item.name)}
                />
              ))}
            </ListCard>
          </>
        )}
      </Screen>
    </PermissionRequired>
  )
}
