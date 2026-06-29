// Per-module analytics screens — each mirrors the web's report page: a
// permission gate, a date-range selector, and a generic `ModuleAnalyticsView`
// driven by `api.reports.<module>()`. A single factory builds every screen so
// they stay identical apart from the permission + data source.

import * as React from 'react'
import { ReportsPermissions } from '@turbohesap/shared'
import type { ModuleStatsDto, StatGranularity, StatsQuery } from '@turbohesap/shared'

import { EmptyState, FormSelect, PermissionRequired, Screen } from '../../components'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth/auth-context'
import { useAsync } from '../../lib/use-async'
import { useNav } from '../../navigation/nav-context'
import { ModuleAnalyticsView } from './ModuleAnalyticsView'

type RangeKey = '7' | '30' | '90'

const RANGE: Record<RangeKey, { days: number; granularity: StatGranularity }> = {
  '7': { days: 7, granularity: 'day' },
  '30': { days: 30, granularity: 'day' },
  '90': { days: 90, granularity: 'week' },
}

const RANGE_OPTIONS = [
  { value: '7' as RangeKey, label: 'Son 7 gün' },
  { value: '30' as RangeKey, label: 'Son 30 gün' },
  { value: '90' as RangeKey, label: 'Son 90 gün' },
]

function isoDaysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

function rangeToQuery(range: RangeKey): StatsQuery {
  const { days, granularity } = RANGE[range]
  return { from: isoDaysAgo(days), to: isoDaysAgo(0), granularity }
}

function makeAnalyticsScreen(opts: {
  permission: string
  title: string
  fetch: (query: StatsQuery) => Promise<ModuleStatsDto>
}) {
  return function AnalyticsScreen() {
    const nav = useNav()
    const { hasPermission } = useAuth()
    const canRead = hasPermission(opts.permission)
    const [range, setRange] = React.useState<RangeKey>('30')

    const stats = useAsync(() => opts.fetch(rangeToQuery(range)), [range], { enabled: canRead })

    return (
      <PermissionRequired
        permission={opts.permission}
        title={opts.title}
        onBack={nav.canGoBack ? nav.goBack : undefined}
      >
        <Screen
          header={{ title: opts.title, large: !nav.canGoBack, onBack: nav.canGoBack ? nav.goBack : undefined }}
          onRefresh={stats.refetch}
          refreshing={stats.refreshing}
        >
          <FormSelect label="Dönem" value={range} onChange={setRange} options={RANGE_OPTIONS} />

          {stats.error ? (
            <EmptyState
              icon="alert-triangle"
              tone="destructive"
              title="Yüklenemedi"
              description={stats.error}
              actionLabel="Tekrar dene"
              onAction={stats.refetch}
            />
          ) : (
            <ModuleAnalyticsView stats={stats.data ?? undefined} loading={stats.loading} />
          )}
        </Screen>
      </PermissionRequired>
    )
  }
}

// Overview keeps the existing `genel.analytics` key.
export const AnalyticsScreen = makeAnalyticsScreen({
  permission: ReportsPermissions.overview,
  title: 'Genel Analiz',
  fetch: (q) => api.reports.overview(q),
})

export const PosAnalyticsScreen = makeAnalyticsScreen({
  permission: ReportsPermissions.pos,
  title: 'POS Analizi',
  fetch: (q) => api.reports.pos(q),
})

export const InventoryAnalyticsScreen = makeAnalyticsScreen({
  permission: ReportsPermissions.inventory,
  title: 'Envanter Analizi',
  fetch: (q) => api.reports.inventory(q),
})

export const FinanceAnalyticsScreen = makeAnalyticsScreen({
  permission: ReportsPermissions.finance,
  title: 'Finans Analizi',
  fetch: (q) => api.reports.finance(q),
})

export const InvoicesAnalyticsScreen = makeAnalyticsScreen({
  permission: ReportsPermissions.invoices,
  title: 'Fatura Analizi',
  fetch: (q) => api.reports.invoices(q),
})

export const ContactsAnalyticsScreen = makeAnalyticsScreen({
  permission: ReportsPermissions.contacts,
  title: 'Cari Analizi',
  fetch: (q) => api.reports.contacts(q),
})

export const SalesAnalyticsScreen = makeAnalyticsScreen({
  permission: ReportsPermissions.sales,
  title: 'Satış Analizi',
  fetch: (q) => api.reports.sales(q),
})
