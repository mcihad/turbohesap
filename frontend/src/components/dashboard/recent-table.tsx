// RecentTable — "Son eklenenler/işlemler" as a compact table. Name (+ subtitle),
// an optional value column, and relative time. Rows can link.

import { Link } from '@tanstack/react-router'
import type { LucideIcon } from 'lucide-react'
import { Clock } from 'lucide-react'

import { formatRelative } from '@/lib/datetime'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export interface RecentRow {
  id: string
  name: string
  sub?: string
  value?: React.ReactNode
  at?: string
  to?: string
  params?: Record<string, string>
}

export function RecentTable({
  title = 'Son eklenenler',
  icon: Icon,
  valueHeader,
  rows,
  loading = false,
  emptyText = 'Henüz kayıt yok',
}: {
  title?: string
  icon?: LucideIcon
  valueHeader?: string
  rows: RecentRow[]
  loading?: boolean
  emptyText?: string
}) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          {Icon ? <Icon className="size-4 text-muted-foreground" /> : null}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0 pb-2">
        {loading ? (
          <div className="space-y-2 px-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">{emptyText}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ad</TableHead>
                {valueHeader ? <TableHead className="text-right">{valueHeader}</TableHead> : null}
                <TableHead className="text-right">Zaman</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    {r.to ? (
                      <Link to={r.to} params={r.params} className="font-medium text-primary hover:underline">
                        {r.name}
                      </Link>
                    ) : (
                      <span className="font-medium">{r.name}</span>
                    )}
                    {r.sub ? <p className="truncate text-xs text-muted-foreground">{r.sub}</p> : null}
                  </TableCell>
                  {valueHeader ? <TableCell className="text-right tabular-nums">{r.value ?? '—'}</TableCell> : null}
                  <TableCell className="text-right text-2xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="size-3" />
                      {r.at ? formatRelative(r.at) : '—'}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
