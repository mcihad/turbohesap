// ChartCard — a titled card wrapping an EChart (or an empty state when there's no
// data). The standard dashboard chart container.

import type { EChartsOption } from 'echarts'
import { BarChart3 } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { EChart } from './echart'

export function ChartCard({
  title,
  subtitle,
  option,
  height = 260,
  loading = false,
  isEmpty = false,
  emptyText = 'Gösterilecek veri yok',
  className,
}: {
  title: string
  subtitle?: string
  option: EChartsOption
  height?: number
  loading?: boolean
  isEmpty?: boolean
  emptyText?: string
  className?: string
}) {
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
        {subtitle ? <p className="text-xs text-muted-foreground">{subtitle}</p> : null}
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="w-full rounded-lg" style={{ height }} />
        ) : isEmpty ? (
          <div
            className="flex flex-col items-center justify-center gap-2 text-muted-foreground"
            style={{ height }}
          >
            <BarChart3 className="size-8" />
            <p className="text-sm">{emptyText}</p>
          </div>
        ) : (
          <EChart option={option} height={height} />
        )}
      </CardContent>
    </Card>
  )
}
