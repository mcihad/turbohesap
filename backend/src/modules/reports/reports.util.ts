// Shared helpers for the reports module: range/granularity resolution, numeric
// coercion of Postgres numeric strings, JS date bucketing (day / ISO-week /
// month), and deterministic cache-key construction. Mirrors the helper style of
// inventory/product-stats.service.ts so aggregation services stay terse.

import type { StatGranularity, StatsQuery } from '@turbohesap/shared'

import { configuration } from '../../config/configuration'

export interface ResolvedRange {
  /** Inclusive lower bound, yyyy-mm-dd. */
  from: string
  /** Inclusive upper bound, yyyy-mm-dd. */
  to: string
  granularity: StatGranularity
  /** Optional branch scoping (only applied where a branchId column exists). */
  branchId?: string
}

/** Coerce a Postgres numeric string (or anything) into a finite number. */
export function num(v: unknown): number {
  if (v == null) return 0
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

/** Round to 2 decimals, killing binary-float fuzz. */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

/** yyyy-mm-dd `days` before `iso`. */
export function daysAgo(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() - days)
  return d.toISOString().slice(0, 10)
}

/**
 * Resolve a StatsQuery into a concrete range. Defaults: to = today,
 * from = today − 30 days, granularity = 'week'.
 */
export function resolveRange(query?: StatsQuery): ResolvedRange {
  const to = (query?.to ?? new Date().toISOString().slice(0, 10)).slice(0, 10)
  const from = (query?.from ?? daysAgo(to, 30)).slice(0, 10)
  const granularity: StatGranularity = query?.granularity ?? 'week'
  const branchId = query?.branchId || undefined
  return { from, to, granularity, branchId }
}

/** Bucket a yyyy-mm-dd date into a day / ISO-week / month label. */
export function bucketKey(iso: string, g: StatGranularity): string {
  const ymd = iso.slice(0, 10)
  if (g === 'day') return ymd
  if (g === 'month') return ymd.slice(0, 7)
  const d = new Date(`${ymd}T00:00:00Z`)
  // ISO week number.
  const day = (d.getUTCDay() + 6) % 7
  d.setUTCDate(d.getUTCDate() - day + 3)
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4))
  const week =
    1 +
    Math.round(
      ((d.getTime() - firstThursday.getTime()) / 86400000 -
        3 +
        ((firstThursday.getUTCDay() + 6) % 7)) /
        7,
    )
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

/** Deterministic cache key (driver adds its own configured prefix). */
export function cacheKeyFor(module: string, r: ResolvedRange): string {
  return `reports:${module}:${r.from}:${r.to}:${r.granularity}:${r.branchId ?? 'all'}`
}

/** Configured cache TTL in seconds. */
export function reportsTtl(): number {
  return configuration().cache.ttl
}
