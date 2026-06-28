import * as React from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowDownLeft, ArrowUpRight, Activity } from 'lucide-react'

import {
  InventoryPermissions,
  OrgPermissions,
  type MovementDirection,
  type ProductDto,
  type StockMovementDto,
  type StockMovementTypeDto,
} from '@turbohesap/shared'

import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth/auth-context'
import { formatDate } from '@/lib/datetime'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DataGrid, type ColumnDef } from '@/components/data-grid'
import { StockMatrix } from './stock-matrix'
import { StockMovementDialog } from './stock-movement-dialog'

const directionLabel = (d: MovementDirection) => (d === 'in' ? 'Giriş' : 'Çıkış')

function DirectionBadge({ direction }: { direction: MovementDirection }) {
  return (
    <Badge variant={direction === 'in' ? 'success' : 'destructive'}>
      {directionLabel(direction)}
    </Badge>
  )
}

export function StockTab({
  product,
  canStock,
  refetch,
}: {
  product: ProductDto
  canStock: boolean
  refetch: () => void
}) {
  const { hasPermission } = useAuth()
  const qc = useQueryClient()
  const branchesQuery = useQuery({
    queryKey: ['org', 'branches'],
    queryFn: () => api.org.branches.list(),
    enabled: hasPermission(OrgPermissions.branchesRead),
  })
  const branches = branchesQuery.data ?? []

  const canMove = hasPermission(InventoryPermissions.productsStock)

  const movementTypesQuery = useQuery({
    queryKey: ['inventory', 'movementTypes'],
    queryFn: () => api.inventory.movementTypes.list(),
    enabled: canMove,
  })
  const movementTypes = (movementTypesQuery.data ?? []).filter((t) => t.isActive)

  const movementsQuery = useQuery({
    queryKey: ['inventory', 'stockMovements', product.id],
    queryFn: () => api.inventory.stockMovements.list({ productId: product.id }),
    enabled: hasPermission(InventoryPermissions.productsRead),
  })
  const movements = movementsQuery.data ?? []

  const [movementType, setMovementType] = React.useState<StockMovementTypeDto | null>(null)

  const stockRows = product.stock ?? []
  const total = stockRows.length
    ? stockRows.reduce((s, r) => s + r.quantity, 0)
    : product.quantity

  // After a movement: refresh the ledger and on-hand stock.
  const onMovementSaved = () => {
    void qc.invalidateQueries({ queryKey: ['inventory', 'stockMovements', product.id] })
    refetch()
  }

  const movementColumns: ColumnDef<StockMovementDto>[] = [
    {
      id: 'date',
      accessorKey: 'date',
      header: 'Tarih',
      size: 120,
      cell: ({ row }) => <span className="tabular-nums">{formatDate(row.original.date)}</span>,
    },
    {
      id: 'movementTypeName',
      accessorKey: 'movementTypeName',
      header: 'Hareket tipi',
      size: 180,
      enableGrouping: true,
      cell: ({ row }) => <span className="font-medium">{row.original.movementTypeName}</span>,
    },
    {
      id: 'direction',
      accessorKey: 'direction',
      header: 'Yön',
      size: 100,
      enableGrouping: true,
      accessorFn: (m) => directionLabel(m.direction),
      cell: ({ row }) => <DirectionBadge direction={row.original.direction} />,
    },
    {
      id: 'quantity',
      accessorKey: 'quantity',
      header: 'Miktar',
      size: 120,
      cell: ({ row }) => (
        <span
          className={cn(
            'tabular-nums font-medium',
            row.original.direction === 'in' ? 'text-success' : 'text-destructive',
          )}
        >
          {row.original.direction === 'in' ? '+' : '−'}
          {row.original.quantity}
          {row.original.unit ? (
            <span className="ml-1 text-xs text-muted-foreground">{row.original.unit}</span>
          ) : null}
        </span>
      ),
    },
    {
      id: 'branchName',
      header: 'Şube',
      size: 160,
      enableGrouping: true,
      accessorFn: (m) => m.branchName ?? 'Genel',
      cell: ({ row }) =>
        row.original.branchName ?? <span className="text-muted-foreground">Genel</span>,
    },
    {
      id: 'description',
      accessorKey: 'description',
      header: 'Açıklama',
      size: 220,
      cell: ({ row }) =>
        row.original.description ? (
          <span className="text-sm">{row.original.description}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      id: 'sourceModule',
      accessorKey: 'sourceModule',
      header: 'Kaynak',
      size: 110,
      enableGrouping: true,
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
      {canMove ? (
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button>
                <Activity className="size-4" />
                Stok Hareketi
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-56">
              <DropdownMenuLabel>Hareket tipi seçin</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {movementTypes.length === 0 ? (
                <DropdownMenuItem disabled>Hareket tipi yok</DropdownMenuItem>
              ) : (
                movementTypes.map((t) => (
                  <DropdownMenuItem key={t.id} onSelect={() => setMovementType(t)}>
                    {t.direction === 'in' ? (
                      <ArrowDownLeft className="size-4 text-success" />
                    ) : (
                      <ArrowUpRight className="size-4 text-destructive" />
                    )}
                    <span className="flex-1">{t.name}</span>
                    <span className="text-xs text-muted-foreground">{directionLabel(t.direction)}</span>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ) : null}

      <StockMatrix product={product} branches={branches} canStock={canStock} refetch={refetch} />

      <p className="text-right text-sm text-muted-foreground">
        Toplam stok: <span className="font-medium text-foreground tabular-nums">{total}</span>
        {product.unit ? ` ${product.unit}` : ''}
      </p>

      <div className="space-y-2 pt-2">
        <h3 className="text-sm font-medium">Stok Hareketleri</h3>
        <DataGrid
          gridId="inventory.stockMovements"
          data={movements}
          columns={movementColumns}
          getRowId={(m) => m.id}
          loading={movementsQuery.isLoading}
          emptyText="Henüz stok hareketi yok."
          pageSize={25}
        />
      </div>

      <StockMovementDialog
        open={movementType !== null}
        onOpenChange={(o) => { if (!o) setMovementType(null) }}
        productId={product.id}
        movementType={movementType}
        branches={branches}
        onSaved={onMovementSaved}
      />
    </div>
  )
}
