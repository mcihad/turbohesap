// ModuleAnalyticsView — renders a generic `ModuleStatsDto` (KPIs, a main trend,
// N breakdown charts, N top lists) for any module's analytics page. The shape is
// uniform across modules so this single view powers every report page.

import type { LucideIcon } from 'lucide-react'
import { AlertTriangle, Coins, Hash, Package, Percent } from 'lucide-react'
import type {
  ModuleStatsDto,
  StatKpi,
  StatUnit,
} from '@turbohesap/shared'

import { barOption, donutOption, lineOption, type Datum } from '@/components/dashboard/echart'
import { ChartCard } from '@/components/dashboard/chart-card'
import { RecentTable, type RecentRow } from '@/components/dashboard/recent-table'
import { StatGrid, StatTile, type StatTone } from '@/components/layout/stat-tile'
import { Button } from '@/components/ui/button'

// ── Formatting ────────────────────────────────────────────────────────────────

function formatMoney(value: number, currency = 'TRY'): string {
  try {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(value)
  } catch {
    return `${value} ${currency}`
  }
}

const numberFmt = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 1 })

function formatPercent(value: number): string {
  return `%${numberFmt.format(value)}`
}

/** Format a numeric value according to its `StatUnit`. */
function formatValue(value: number, unit: StatUnit, currency: string): string {
  switch (unit) {
    case 'money':
      return formatMoney(value, currency)
    case 'percent':
      return formatPercent(value)
    case 'qty':
    case 'count':
    default:
      return numberFmt.format(value)
  }
}

// Pick a representative icon per unit so the KPI tiles read at a glance.
const UNIT_ICON: Record<StatUnit, LucideIcon> = {
  money: Coins,
  percent: Percent,
  qty: Package,
  count: Hash,
}

function kpiTrend(kpi: StatKpi): { value: string; up: boolean } | undefined {
  if (kpi.delta == null) return undefined
  const pct = Math.round(kpi.delta * 100)
  return { value: `${pct >= 0 ? '+' : ''}${pct}%`, up: kpi.delta >= 0 }
}

// StatSlice[] → Datum[] (the chart kit takes {name,value}; per-slice color is
// not supported by the kit, so it is intentionally dropped).
function toData(slices: { name: string; value: number }[]): Datum[] {
  return slices.map((s) => ({ name: s.name, value: s.value }))
}

// ── View ──────────────────────────────────────────────────────────────────────

export function ModuleAnalyticsView({
  stats,
  loading,
  error,
  errorMessage,
  onRetry,
}: {
  stats?: ModuleStatsDto
  loading: boolean
  /** True when the fetch failed (shows an error + retry instead of an empty skeleton). */
  error?: boolean
  /** The underlying error detail (status / message), surfaced for diagnosis. */
  errorMessage?: string
  onRetry?: () => void
}) {
  const currency = stats?.currency ?? 'TRY'

  // Loading skeleton: placeholder KPI tiles + chart cards.
  if (loading) {
    return (
      <div className="space-y-6">
        <StatGrid>
          {Array.from({ length: 4 }).map((_, i) => (
            <StatTile key={i} icon={Hash} value="" label="" loading />
          ))}
        </StatGrid>
        <ChartCard title="" option={{}} loading height={300} />
        <div className="grid gap-4 lg:grid-cols-2">
          <ChartCard title="" option={{}} loading />
          <ChartCard title="" option={{}} loading />
        </div>
      </div>
    )
  }

  // Fetch failed (or no data at all) — show a clear message + retry rather than
  // leaving empty skeleton boxes on screen.
  if (!stats) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-16 text-center">
        <AlertTriangle className="size-8 text-muted-foreground" />
        <div className="text-sm text-muted-foreground">
          {error
            ? 'İstatistikler yüklenemedi. Sunucuya ulaşılamıyor olabilir.'
            : 'Bu dönem için gösterilecek veri yok.'}
        </div>
        {error && errorMessage ? (
          <code className="max-w-md rounded bg-muted px-2 py-1 text-xs text-destructive">
            {errorMessage}
          </code>
        ) : null}
        {onRetry ? (
          <Button variant="outline" size="sm" onClick={onRetry}>
            Tekrar dene
          </Button>
        ) : null}
      </div>
    )
  }

  const { kpis, trend, breakdowns, topLists } = stats
  const hasValue2 = trend.points.some((p) => p.value2 != null)
  const periods = trend.points.map((p) => p.period)

  return (
    <div className="space-y-6">
      {/* KPIs */}
      {kpis.length > 0 ? (
        <StatGrid>
          {kpis.map((kpi) => (
            <StatTile
              key={kpi.key}
              icon={UNIT_ICON[kpi.unit] ?? Hash}
              value={formatValue(kpi.value, kpi.unit, currency)}
              label={kpi.label}
              tone={(kpi.tone as StatTone) ?? 'primary'}
              trend={kpiTrend(kpi)}
            />
          ))}
        </StatGrid>
      ) : null}

      {/* Main trend */}
      <ChartCard
        title={trend.label}
        option={lineOption(periods, trend.points.map((p) => p.value))}
        height={300}
        isEmpty={trend.points.length === 0}
      />

      {/* Secondary series (when present) as its own card. */}
      {hasValue2 ? (
        <ChartCard
          title={trend.label2 ?? `${trend.label} (2)`}
          option={lineOption(
            periods,
            trend.points.map((p) => p.value2 ?? 0),
            '#2e74e6',
          )}
          height={260}
          isEmpty={trend.points.length === 0}
        />
      ) : null}

      {/* Breakdowns */}
      {breakdowns.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {breakdowns.map((b) => (
            <ChartCard
              key={b.key}
              title={b.label}
              option={
                b.chart === 'donut'
                  ? donutOption(toData(b.data))
                  : barOption(toData(b.data), { horizontal: true })
              }
              isEmpty={b.data.length === 0}
            />
          ))}
        </div>
      ) : null}

      {/* Top lists */}
      {topLists.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {topLists.map((list) => {
            const rows: RecentRow[] = list.rows.map((r, i) => ({
              id: r.id ?? `${list.key}-${i}`,
              name: r.name,
              sub: r.sub,
              value: formatValue(r.value, list.unit, currency),
            }))
            return (
              <RecentTable
                key={list.key}
                title={list.label}
                valueHeader="Değer"
                rows={rows}
              />
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
