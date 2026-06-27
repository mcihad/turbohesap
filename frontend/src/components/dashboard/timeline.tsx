// Timeline — a vertical activity timeline for the dashboards (recent actions).
// Each item is a tinted dot on a connector line with a title, subtitle and time.

import type { LucideIcon } from 'lucide-react'
import { Activity } from 'lucide-react'

import { formatRelative } from '@/lib/datetime'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export type DotTone = 'primary' | 'success' | 'warning' | 'info' | 'destructive' | 'muted'

const DOT: Record<DotTone, string> = {
  primary: 'bg-primary',
  success: 'bg-success',
  warning: 'bg-warning',
  info: 'bg-info',
  destructive: 'bg-destructive',
  muted: 'bg-muted-foreground',
}

export interface TimelineItem {
  id: string
  title: string
  subtitle?: string
  at?: string
  tone?: DotTone
}

export function Timeline({
  title = 'Son işlemler',
  icon: Icon = Activity,
  items,
  loading = false,
  emptyText = 'Henüz işlem yok',
}: {
  title?: string
  icon?: LucideIcon
  items: TimelineItem[]
  loading?: boolean
  emptyText?: string
}) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Icon className="size-4 text-muted-foreground" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{emptyText}</p>
        ) : (
          <ol className="relative ml-1.5 space-y-4 border-l border-border pl-5">
            {items.map((it) => (
              <li key={it.id} className="relative">
                <span
                  className={cn(
                    'absolute top-1 size-2.5 rounded-full ring-4 ring-card',
                    '-left-[1.625rem]',
                    DOT[it.tone ?? 'primary'],
                  )}
                />
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{it.title}</p>
                    {it.subtitle ? (
                      <p className="truncate text-xs text-muted-foreground">{it.subtitle}</p>
                    ) : null}
                  </div>
                  {it.at ? (
                    <span className="shrink-0 text-2xs text-muted-foreground">{formatRelative(it.at)}</span>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  )
}
