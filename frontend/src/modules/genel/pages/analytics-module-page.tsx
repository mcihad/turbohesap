// AnalyticsModulePage — a thin factory that powers every per-module analytics
// page. Given a `fetcher` (one of `api.reports.*`), a `permission`, a `module`
// key and a `title`, it owns the date-range + granularity controls and renders
// the generic `ModuleAnalyticsView` from the fetched `ModuleStatsDto`.

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { format, subDays } from 'date-fns'
import type { ModuleStatsDto, StatGranularity, StatsQuery } from '@turbohesap/shared'

import { PageHeader, PageWrapper } from '@/components/layout/page'
import {
  DateRangePicker,
  type DateRange,
} from '@/components/ui/date-range-picker'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAuth } from '@/lib/auth/auth-context'
import { PermissionRequired } from '@/lib/auth/permission-gate'
import { ModuleAnalyticsView } from '../components/module-analytics-view'

const GRANULARITIES: { value: StatGranularity; label: string }[] = [
  { value: 'day', label: 'Günlük' },
  { value: 'week', label: 'Haftalık' },
  { value: 'month', label: 'Aylık' },
]

function toIso(d?: Date): string | undefined {
  return d ? format(d, 'yyyy-MM-dd') : undefined
}

// Surface a readable error detail (HTTP status + message) for diagnosis.
function errorDetail(err: unknown): string | undefined {
  if (!err) return undefined
  const e = err as { response?: { status?: number; data?: { message?: string } }; message?: string }
  const status = e.response?.status
  const msg = e.response?.data?.message ?? e.message ?? 'Bilinmeyen hata'
  return status ? `HTTP ${status} — ${msg}` : msg
}

export interface AnalyticsModulePageProps {
  /** Stable module key for the query cache (e.g. 'pos'). */
  module: string
  title: string
  description?: string
  permission: string
  fetcher: (query?: StatsQuery) => Promise<ModuleStatsDto>
}

export function AnalyticsModulePage({
  module,
  title,
  description,
  permission,
  fetcher,
}: AnalyticsModulePageProps) {
  const { hasPermission } = useAuth()
  const allowed = hasPermission(permission)

  const [range, setRange] = React.useState<DateRange | undefined>(() => ({
    from: subDays(new Date(), 29),
    to: new Date(),
  }))
  const [granularity, setGranularity] = React.useState<StatGranularity>('day')

  const from = toIso(range?.from)
  const to = toIso(range?.to)

  const query = useQuery({
    queryKey: ['reports', module, { from, to, granularity }],
    queryFn: () => fetcher({ from, to, granularity }),
    enabled: allowed,
  })

  return (
    <PermissionRequired permission={permission}>
      <PageWrapper>
        <PageHeader
          title={title}
          description={description}
          actions={
            <>
              <DateRangePicker
                value={range}
                onChange={setRange}
                align="end"
                className="w-auto sm:w-64"
              />
              <Select
                value={granularity}
                onValueChange={(v) => setGranularity(v as StatGranularity)}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GRANULARITIES.map((g) => (
                    <SelectItem key={g.value} value={g.value}>
                      {g.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          }
        />

        <ModuleAnalyticsView
          stats={query.data}
          loading={query.isLoading}
          error={query.isError}
          errorMessage={errorDetail(query.error)}
          onRetry={() => void query.refetch()}
        />
      </PageWrapper>
    </PermissionRequired>
  )
}
