// StatTile / StatGrid — compact, soft-tinted metric cards for the dashboards.
// A small icon chip, a big value, a label, and an optional trend. Light/dark
// aware via the semantic tone colors. (Dashboards are exempt from DESIGN.md — the
// only rules are dark/light + mobile-first.)

import type { LucideIcon } from 'lucide-react'
import { TrendingDown, TrendingUp } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

export type StatTone = 'primary' | 'success' | 'warning' | 'info' | 'destructive' | 'muted'

// Soft tinted card surface + matching icon chip per tone.
const TONE: Record<StatTone, { card: string; chip: string }> = {
  primary: { card: 'from-primary/15 to-primary/5 border-primary/15', chip: 'bg-primary/15 text-primary' },
  success: { card: 'from-success/15 to-success/5 border-success/15', chip: 'bg-success/15 text-success' },
  warning: { card: 'from-warning/20 to-warning/5 border-warning/20', chip: 'bg-warning/20 text-warning' },
  info: { card: 'from-info/15 to-info/5 border-info/15', chip: 'bg-info/15 text-info' },
  destructive: { card: 'from-destructive/15 to-destructive/5 border-destructive/15', chip: 'bg-destructive/15 text-destructive' },
  muted: { card: 'from-muted to-card border-border', chip: 'bg-background text-muted-foreground' },
}

export function StatGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{children}</div>
}

export function StatTile({
  icon: Icon,
  value,
  label,
  tone = 'primary',
  hint,
  trend,
  loading = false,
}: {
  icon: LucideIcon
  value: React.ReactNode
  label: string
  tone?: StatTone
  hint?: string
  /** Optional trend, e.g. { value: '+12%', up: true }. */
  trend?: { value: string; up: boolean }
  loading?: boolean
}) {
  const c = TONE[tone]
  return (
    <div className={cn('relative overflow-hidden rounded-xl border bg-gradient-to-br p-3.5 shadow-sm', c.card)}>
      <div className="flex items-center justify-between">
        <span className={cn('flex size-8 items-center justify-center rounded-lg', c.chip)}>
          <Icon className="size-4" />
        </span>
        {trend ? (
          <span
            className={cn(
              'flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-2xs font-medium',
              trend.up ? 'bg-success/15 text-success' : 'bg-destructive/15 text-destructive',
            )}
          >
            {trend.up ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
            {trend.value}
          </span>
        ) : null}
      </div>
      <div className="mt-2.5">
        {loading ? (
          <Skeleton className="h-7 w-14" />
        ) : (
          <p className="text-xl font-semibold leading-tight tabular-nums">{value}</p>
        )}
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{label}</p>
        {hint ? <p className="truncate text-2xs text-muted-foreground/80">{hint}</p> : null}
      </div>
    </div>
  )
}
