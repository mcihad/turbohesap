// RecentList — "Son eklenenler" card: a compact list of recently created entities
// with an icon chip, title, subtitle and relative time. Rows optionally link.

import { Link } from '@tanstack/react-router'
import type { LucideIcon } from 'lucide-react'
import { Clock } from 'lucide-react'

import { formatRelative } from '@/lib/datetime'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export interface RecentItem {
  id: string
  title: string
  subtitle?: string
  /** ISO timestamp shown as relative time. */
  at?: string
  /** Optional route to link the row to. */
  to?: string
  params?: Record<string, string>
}

export function RecentList({
  title = 'Son eklenenler',
  icon: Icon = Clock,
  items,
  loading = false,
  emptyText = 'Henüz kayıt yok',
}: {
  title?: string
  icon?: LucideIcon
  items: RecentItem[]
  loading?: boolean
  emptyText?: string
}) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="px-2">
        {loading ? (
          <div className="space-y-2 p-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="p-4 text-center text-sm text-muted-foreground">{emptyText}</p>
        ) : (
          <ul className="space-y-0.5">
            {items.map((it) => {
              const body = (
                <div className="flex items-center gap-3 rounded-md p-2 transition-colors hover:bg-muted/50">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{it.title}</p>
                    {it.subtitle ? (
                      <p className="truncate text-xs text-muted-foreground">{it.subtitle}</p>
                    ) : null}
                  </div>
                  {it.at ? (
                    <span className="shrink-0 text-2xs text-muted-foreground">
                      {formatRelative(it.at)}
                    </span>
                  ) : null}
                </div>
              )
              return (
                <li key={it.id}>
                  {it.to ? (
                    <Link to={it.to} params={it.params}>
                      {body}
                    </Link>
                  ) : (
                    body
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
