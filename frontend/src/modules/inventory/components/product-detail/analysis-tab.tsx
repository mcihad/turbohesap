import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Activity, Boxes, Receipt, TrendingUp } from 'lucide-react'

import {
  InventoryPermissions,
  type MovementDirection,
  type ProductDto,
  type StockMovementDto,
} from '@turbohesap/shared'

import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth/auth-context'
import { formatDate } from '@/lib/datetime'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { DataGrid, type ColumnDef } from '@/components/data-grid'
import { ChartCard } from '@/components/dashboard/chart-card'
import { lineOption, donutOption, type Datum } from '@/components/dashboard/echart'
import { money } from '../../labels'

const directionLabel = (d: MovementDirection) => (d === 'in' ? 'Giriş' : 'Çıkış')

// Always-visible product analytics — sales trend, source split, headline numbers,
// and the stock-movements ledger (surfaced here even when the product does NOT
// track stock, so services/consumables still show their movement history).
export function AnalysisTab({ product }: { product: ProductDto }) {
  const { hasPermission } = useAuth()
  const statsQuery = useQuery({
    queryKey: ['inventory', 'products', product.id, 'stats'],
    queryFn: () => api.inventory.products.stats(product.id),
    enabled: hasPermission(InventoryPermissions.productsRead),
  })
  const movementsQuery = useQuery({
    queryKey: ['inventory', 'stockMovements', product.id],
    queryFn: () => api.inventory.stockMovements.list({ productId: product.id }),
    enabled: hasPermission(InventoryPermissions.productsRead),
  })

  const stats = statsQuery.data
  const movements = movementsQuery.data ?? []

  const trendCats = stats?.trend.map((t) => t.period) ?? []
  const trendVals = stats?.trend.map((t) => t.revenue) ?? []
  const bySource = React.useMemo<Datum[]>(
    () =>
      (stats?.bySource ?? [])
        .filter((s) => s.revenue > 0)
        .map((s) => ({ name: s.source === 'pos' ? 'POS' : 'Fatura', value: round2(s.revenue) })),
    [stats],
  )

  const movementColumns: ColumnDef<StockMovementDto>[] = [
    {
      id: 'date', accessorKey: 'date', header: 'Tarih', size: 120,
      cell: ({ row }) => <span className="tabular-nums">{formatDate(row.original.date)}</span>,
    },
    {
      id: 'movementTypeName', accessorKey: 'movementTypeName', header: 'Hareket tipi', size: 180, enableGrouping: true,
      cell: ({ row }) => <span className="font-medium">{row.original.movementTypeName}</span>,
    },
    {
      id: 'direction', accessorKey: 'direction', header: 'Yön', size: 100, enableGrouping: true,
      accessorFn: (m) => directionLabel(m.direction),
      cell: ({ row }) => (
        <Badge variant={row.original.direction === 'in' ? 'success' : 'destructive'}>
          {directionLabel(row.original.direction)}
        </Badge>
      ),
    },
    {
      id: 'quantity', accessorKey: 'quantity', header: 'Miktar', size: 120,
      cell: ({ row }) => (
        <span className={cn('tabular-nums font-medium', row.original.direction === 'in' ? 'text-success' : 'text-destructive')}>
          {row.original.direction === 'in' ? '+' : '−'}
          {row.original.quantity}
          {row.original.unit ? <span className="ml-1 text-xs text-muted-foreground">{row.original.unit}</span> : null}
        </span>
      ),
    },
    {
      id: 'branchName', header: 'Şube', size: 150, enableGrouping: true,
      accessorFn: (m) => m.branchName ?? 'Genel',
      cell: ({ row }) => row.original.branchName ?? <span className="text-muted-foreground">Genel</span>,
    },
    {
      id: 'sourceModule', accessorKey: 'sourceModule', header: 'Kaynak', size: 110, enableGrouping: true,
      accessorFn: (m) => m.sourceModule ?? '',
      cell: ({ row }) =>
        row.original.sourceModule === 'invoices' ? (
          <Badge variant="secondary">Fatura</Badge>
        ) : row.original.sourceModule ? (
          <Badge variant="outline">{row.original.sourceModule}</Badge>
        ) : (
          <span className="text-muted-foreground">Manuel</span>
        ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={Boxes} label="Satılan miktar" value={fmt(stats?.totalQty)} loading={statsQuery.isLoading} />
        <Stat icon={TrendingUp} label="Ciro" value={money(stats?.totalRevenue ?? 0, product.currency)} loading={statsQuery.isLoading} />
        <Stat icon={Receipt} label="Belge sayısı" value={fmt(stats?.orderCount)} loading={statsQuery.isLoading} />
        <Stat icon={Activity} label="Eldeki stok" value={`${fmt(stats?.onHand)}${product.unit ? ` ${product.unit}` : ''}`} loading={statsQuery.isLoading} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard
          title="Satış trendi"
          subtitle="Dönem bazında ciro"
          className="lg:col-span-2"
          loading={statsQuery.isLoading}
          isEmpty={trendVals.every((v) => v === 0)}
          option={lineOption(trendCats, trendVals)}
        />
        <ChartCard
          title="Kaynak dağılımı"
          subtitle="Fatura ve POS cirosu"
          loading={statsQuery.isLoading}
          isEmpty={bySource.length === 0}
          option={donutOption(bySource, 'Ciro')}
        />
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-medium">Stok Hareketleri</h3>
        <DataGrid
          gridId="inventory.analysisMovements"
          data={movements}
          columns={movementColumns}
          getRowId={(m) => m.id}
          loading={movementsQuery.isLoading}
          emptyText="Henüz stok hareketi yok."
          pageSize={25}
        />
      </div>
    </div>
  )
}

function Stat({
  icon: Icon,
  label,
  value,
  loading,
}: {
  icon: typeof Boxes
  label: string
  value: string
  loading?: boolean
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-lg font-bold leading-tight tabular-nums">{loading ? '…' : value}</p>
          <p className="text-2xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function fmt(n: number | undefined): string {
  return n == null ? '—' : String(round2(n))
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}
