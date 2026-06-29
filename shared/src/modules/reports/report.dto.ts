// Per-module analytics/statistics. Every module's report endpoint returns the
// SAME generic, flexible shape (`ModuleStatsDto`) so the web + mobile can render
// it uniformly: a KPI row, one main time-series trend, N breakdown charts
// (donut/bar), and N "top" lists. Each module fills it with its own content.
// Results are cached server-side (memory by default; redis/memcached via .env).

export type StatGranularity = 'day' | 'week' | 'month'

export interface StatsQuery {
  /** ISO date (yyyy-mm-dd) inclusive lower bound; defaults to ~30 days ago. */
  from?: string
  /** ISO date inclusive upper bound; defaults to today. */
  to?: string
  granularity?: StatGranularity
  /** Optional branch scoping. */
  branchId?: string
}

/** How a numeric value should be formatted by the UI. */
export type StatUnit = 'money' | 'count' | 'qty' | 'percent'

export interface StatKpi {
  key: string
  label: string
  value: number
  unit: StatUnit
  /** Optional change vs the previous comparable period (fraction, e.g. 0.12). */
  delta?: number | null
  /** Optional tone hint for the tile. */
  tone?: 'primary' | 'success' | 'warning' | 'info' | 'destructive' | 'muted'
}

export interface StatPoint {
  /** Bucket label (e.g. "2026-06-29" or "2026-W26"). */
  period: string
  value: number
  /** Optional secondary series (e.g. expense vs income). */
  value2?: number
}

export interface StatSlice {
  name: string
  value: number
  /** Optional explicit color (e.g. pipeline-stage color). */
  color?: string
}

export interface StatBreakdown {
  key: string
  label: string
  chart: 'donut' | 'bar'
  unit: StatUnit
  data: StatSlice[]
}

export interface StatTopRow {
  id?: string
  name: string
  value: number
  sub?: string
}

export interface StatTopList {
  key: string
  label: string
  unit: StatUnit
  rows: StatTopRow[]
}

export interface ModuleStatsDto {
  module: string
  from: string
  to: string
  granularity: StatGranularity
  currency: string
  kpis: StatKpi[]
  /** Main time series (e.g. revenue over time). */
  trend: { key: string; label: string; unit: StatUnit; points: StatPoint[]; label2?: string }
  breakdowns: StatBreakdown[]
  topLists: StatTopList[]
}
