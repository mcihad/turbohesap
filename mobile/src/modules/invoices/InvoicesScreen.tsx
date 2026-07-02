import * as React from 'react'
import { View } from 'react-native'
import { InvoicesPermissions, type InvoiceType } from '@turbohesap/shared'
import {
  Badge,
  EmptyState,
  HeaderAction,
  ListCard,
  ListRow,
  LoadMoreFooter,
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
import { usePaginated } from '../../lib/use-paginated'
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

  const invoices = usePaginated(
    (page) => api.invoices.listPage({ page, pageSize: 30, type: filter === 'all' ? undefined : filter }),
    [filter],
    { enabled: canRead },
  )
  const items = invoices.items

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
        onRefresh={invoices.refresh}
        refreshing={invoices.refreshing}
        onEndReached={invoices.loadMore}
      >
        <SegmentedControl options={FILTER_OPTIONS} value={filter} onChange={setFilter} />

        {invoices.loading ? (
          <SkeletonRows count={6} />
        ) : invoices.error && items.length === 0 ? (
          <EmptyState
            icon="alert-triangle"
            tone="destructive"
            title="Yüklenemedi"
            description={invoices.error}
            actionLabel="Tekrar dene"
            onAction={invoices.refresh}
          />
        ) : items.length === 0 ? (
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
              {items.length} / {invoices.total} Fatura
            </Text>
            <ListCard>
              {items.map((inv) => (
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
            <LoadMoreFooter loadingMore={invoices.loadingMore} hasMore={invoices.hasMore} total={invoices.total} />
          </>
        )}
      </Screen>
    </PermissionRequired>
  )
}
