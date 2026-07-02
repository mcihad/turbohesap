// InstrumentsListScreen — the çek/senet portfolio list. Search + an advanced
// filter bottom sheet (direction/type/status/contact/vade aralığı); filtering
// is server-side (GET /finance/instruments already accepts all of these).
// Mirrors documents/DocumentsListScreen's shape.

import * as React from 'react'
import { Pressable, View } from 'react-native'

import {
  computeInstrumentDueStatus,
  FinancePermissions,
  type InstrumentDirection,
  type InstrumentListQuery,
  type InstrumentStatus,
  type InstrumentType,
} from '@turbohesap/shared'

import {
  Badge,
  EmptyState,
  HeaderAction,
  Icon,
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
import { formatDate } from '../../lib/datetime'
import { useAsync } from '../../lib/use-async'
import { useNav } from '../../navigation/nav-context'
import { useTheme } from '../../theme/theme-context'
import { formatMoney } from './CashAccountsScreen'
import { InstrumentFilterSheet, instrumentFilterCount } from './InstrumentFilterSheet'
import {
  INSTRUMENT_DIRECTION_LABELS,
  INSTRUMENT_TYPE_LABELS,
  instrumentStatusLabel,
  instrumentStatusTone,
} from './instrument-labels'

export interface InstrumentFilters {
  direction: InstrumentDirection | null
  instrumentType: InstrumentType | null
  status: InstrumentStatus | null
  contactId: string | null
  from: string | null
  to: string | null
}

export const EMPTY_INSTRUMENT_FILTERS: InstrumentFilters = {
  direction: null,
  instrumentType: null,
  status: null,
  contactId: null,
  from: null,
  to: null,
}

export function InstrumentsListScreen() {
  const t = useTheme()
  const nav = useNav()
  const { hasPermission } = useAuth()
  const canRead = hasPermission(FinancePermissions.instrumentsRead)
  const canWrite = hasPermission(FinancePermissions.instrumentsWrite)

  const [search, setSearch] = React.useState('')
  const [filters, setFilters] = React.useState<InstrumentFilters>(EMPTY_INSTRUMENT_FILTERS)
  const [sheetOpen, setSheetOpen] = React.useState(false)

  const query: InstrumentListQuery = React.useMemo(
    () => ({
      direction: filters.direction ?? undefined,
      instrumentType: filters.instrumentType ?? undefined,
      status: filters.status ?? undefined,
      contactId: filters.contactId ?? undefined,
      from: filters.from ?? undefined,
      to: filters.to ?? undefined,
      search: search.trim() || undefined,
    }),
    [filters, search],
  )

  const instruments = useAsync(
    () => api.finance.instruments.list(query),
    [query.direction, query.instrumentType, query.status, query.contactId, query.from, query.to, query.search],
    { enabled: canRead },
  )
  const contacts = useAsync(() => api.contacts.contacts.list(), [], { enabled: canRead })

  const rows = instruments.data ?? []
  const filterCount = instrumentFilterCount(filters)

  return (
    <PermissionRequired permission={FinancePermissions.instrumentsRead} title="Çek/Senet" onBack={nav.canGoBack ? nav.goBack : undefined}>
      <Screen
        header={{
          title: 'Çek/Senet',
          large: !nav.canGoBack,
          onBack: nav.canGoBack ? nav.goBack : undefined,
          right: canWrite ? (
            <HeaderAction icon="plus" onPress={() => nav.navigate('finance.instruments.form', {}, 'Yeni Çek/Senet')} />
          ) : undefined,
        }}
        onRefresh={instruments.refetch}
        refreshing={instruments.refreshing}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing[2] }}>
          <View style={{ flex: 1 }}>
            <Input icon="search" placeholder="Cari, evrak no, açıklama…" value={search} onChangeText={setSearch} />
          </View>
          <Pressable
            onPress={() => setSheetOpen(true)}
            style={({ pressed }) => [
              {
                width: 48,
                height: 48,
                borderRadius: t.radius.md,
                borderWidth: 1,
                borderColor: filterCount > 0 ? t.colors.primary : t.colors.inputBorder,
                backgroundColor: filterCount > 0 ? t.colors.primarySoft : t.colors.card,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <Icon name="sliders" size={20} color={filterCount > 0 ? t.colors.primary : t.colors.mutedForeground} />
            {filterCount > 0 ? (
              <View
                style={{
                  position: 'absolute',
                  top: -5,
                  right: -5,
                  minWidth: 18,
                  height: 18,
                  paddingHorizontal: 4,
                  borderRadius: 9,
                  backgroundColor: t.colors.primary,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text variant="caption" weight="bold" style={{ color: t.colors.primaryForeground, fontSize: 10 }}>
                  {filterCount}
                </Text>
              </View>
            ) : null}
          </Pressable>
        </View>

        {instruments.loading ? (
          <SkeletonRows count={6} />
        ) : instruments.error ? (
          <EmptyState icon="alert-triangle" tone="destructive" title="Yüklenemedi" description={instruments.error} actionLabel="Tekrar dene" onAction={instruments.refetch} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon="file-text"
            title="Çek/Senet bulunamadı"
            description={filterCount > 0 || search.trim() ? 'Filtreyle eşleşen kayıt bulunamadı.' : 'Henüz çek/senet eklenmemiş.'}
            actionLabel={filterCount > 0 ? 'Filtreleri temizle' : canWrite ? 'Yeni Çek/Senet' : undefined}
            onAction={
              filterCount > 0
                ? () => setFilters(EMPTY_INSTRUMENT_FILTERS)
                : canWrite
                  ? () => nav.navigate('finance.instruments.form', {}, 'Yeni Çek/Senet')
                  : undefined
            }
          />
        ) : (
          <>
            <Text variant="overline" tone="muted" style={{ paddingHorizontal: t.spacing[1] }}>
              {rows.length} kayıt
            </Text>
            <ListCard>
              {rows.map((it) => {
                const dueStatus =
                  it.status === 'open' || it.status === 'in_collection'
                    ? computeInstrumentDueStatus(it.dueDate)
                    : 'active'
                const dueColor =
                  dueStatus === 'overdue'
                    ? t.colors.destructive
                    : dueStatus === 'due_soon'
                      ? t.colors.warning
                      : t.colors.mutedForeground
                return (
                  <ListRow
                    key={it.id}
                    icon={it.instrumentType === 'check' ? 'file-text' : 'file'}
                    title={it.contactName ?? '—'}
                    subtitle={`${INSTRUMENT_TYPE_LABELS[it.instrumentType]} · ${INSTRUMENT_DIRECTION_LABELS[it.direction]}${it.instrumentNo ? ` · ${it.instrumentNo}` : ''}`}
                    trailing={
                      <View style={{ alignItems: 'flex-end', gap: 4 }}>
                        <Text style={{ fontWeight: 'bold', fontFamily: 'monospace' }}>
                          {formatMoney(it.amount, it.currencyCode)}
                        </Text>
                        <Text variant="caption" style={{ color: dueColor }}>
                          {formatDate(it.dueDate)}
                        </Text>
                        <Badge label={instrumentStatusLabel(it.status)} tone={instrumentStatusTone(it.status)} />
                      </View>
                    }
                    onPress={() => nav.navigate('finance.instruments.detail', { id: it.id }, it.contactName ?? 'Çek/Senet')}
                  />
                )
              })}
            </ListCard>
          </>
        )}

        <InstrumentFilterSheet
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          contacts={contacts.data ?? []}
          filters={filters}
          setFilters={setFilters}
        />
      </Screen>
    </PermissionRequired>
  )
}
