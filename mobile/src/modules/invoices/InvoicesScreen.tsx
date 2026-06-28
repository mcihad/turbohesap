import * as React from 'react'
import { View } from 'react-native'
import { InvoicesPermissions, type InvoiceType } from '@turbohesap/shared'
import {
  Badge,
  EmptyState,
  HeaderAction,
  ListCard,
  ListRow,
  PermissionRequired,
  Screen,
  SegmentedControl,
  type SegmentOption,
  SkeletonRows,
  Text,
} from '../../components'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth/auth-context'
import { formatDate } from '../../lib/datetime'
import { useAsync } from '../../lib/use-async'
import { useNav } from '../../navigation/nav-context'
import { useTheme } from '../../theme/theme-context'
import { formatMoney, STATUS_LABELS, STATUS_TONES, TYPE_LABELS } from './format'

type TypeFilter = 'all' | InvoiceType

const FILTER_OPTIONS: SegmentOption<TypeFilter>[] = [
  { value: 'all', label: 'Tümü' },
  { value: 'sales', label: 'Satış' },
  { value: 'purchase', label: 'Alış' },
]

export function InvoicesScreen() {
  const t = useTheme()
  const nav = useNav()
  const { hasPermission } = useAuth()
  const canRead = hasPermission(InvoicesPermissions.read)
  const canWrite = hasPermission(InvoicesPermissions.write)
  const [filter, setFilter] = React.useState<TypeFilter>('all')

  const invoices = useAsync(() => api.invoices.list(), [], { enabled: canRead })

  const filtered = React.useMemo(() => {
    const list = invoices.data ?? []
    if (filter === 'all') return list
    return list.filter((inv) => inv.type === filter)
  }, [invoices.data, filter])

  const openForm = () => nav.navigate('invoices.invoices.form', {}, 'Yeni fatura')

  return (
    <PermissionRequired
      permission={InvoicesPermissions.read}
      title="Faturalar"
      onBack={nav.canGoBack ? nav.goBack : undefined}
    >
      <Screen
        header={{
          title: 'Faturalar',
          large: !nav.canGoBack,
          onBack: nav.canGoBack ? nav.goBack : undefined,
          right: canWrite ? <HeaderAction icon="plus" onPress={openForm} /> : undefined,
        }}
        onRefresh={invoices.refetch}
        refreshing={invoices.refreshing}
      >
        <SegmentedControl options={FILTER_OPTIONS} value={filter} onChange={setFilter} />

        {invoices.loading ? (
          <SkeletonRows count={6} />
        ) : invoices.error ? (
          <EmptyState
            icon="alert-triangle"
            tone="destructive"
            title="Yüklenemedi"
            description={invoices.error}
            actionLabel="Tekrar dene"
            onAction={invoices.refetch}
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="file-text"
            title="Fatura bulunamadı"
            description={filter === 'all' ? 'Henüz fatura oluşturulmamış.' : 'Bu türde fatura bulunamadı.'}
            actionLabel={canWrite && filter === 'all' ? 'Yeni fatura' : undefined}
            onAction={canWrite && filter === 'all' ? openForm : undefined}
          />
        ) : (
          <>
            <Text variant="overline" tone="muted" style={{ paddingHorizontal: t.spacing[1] }}>
              {filtered.length} Fatura
            </Text>
            <ListCard>
              {filtered.map((inv) => (
                <ListRow
                  key={inv.id}
                  icon={inv.type === 'purchase' ? 'arrow-down-left' : 'file-text'}
                  title={inv.number || 'Taslak'}
                  subtitle={`${inv.contact?.name ?? 'Cari yok'} · ${TYPE_LABELS[inv.type]} · ${formatDate(inv.date)}`}
                  trailing={
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <Text style={{ fontWeight: 'bold', fontFamily: 'monospace' }}>
                        {formatMoney(inv.grandTotal, inv.currencyCode)}
                      </Text>
                      <Badge label={STATUS_LABELS[inv.status]} tone={STATUS_TONES[inv.status]} />
                    </View>
                  }
                  onPress={() =>
                    nav.navigate('invoices.invoices.detail', { id: inv.id }, inv.number || 'Fatura')
                  }
                />
              ))}
            </ListCard>
          </>
        )}
      </Screen>
    </PermissionRequired>
  )
}
