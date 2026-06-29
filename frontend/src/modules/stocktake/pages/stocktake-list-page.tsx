import * as React from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Eye, MoreHorizontal, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import {
  STOCK_COUNT_KIND_LABELS,
  STOCK_COUNT_STATUS_LABELS,
  StocktakePermissions,
  toApiError,
  type StockCountDto,
  type StockCountStatus,
} from '@turbohesap/shared'

import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth/auth-context'
import { PermissionRequired } from '@/lib/auth/permission-gate'
import { formatDate } from '@/lib/datetime'
import { PageWrapper } from '@/components/layout/page'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DataGrid, type ColumnDef } from '@/components/data-grid'
import { StocktakeCreateDialog } from '../components/stocktake-create-dialog'

const STATUS_TONE: Record<
  StockCountStatus,
  'outline' | 'success' | 'info' | 'warning' | 'destructive'
> = {
  draft: 'outline',
  counting: 'info',
  review: 'warning',
  approved: 'success',
  cancelled: 'destructive',
}

export function StocktakeListPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { hasPermission } = useAuth()
  const canRead = hasPermission(StocktakePermissions.read)
  const canCreate = hasPermission(StocktakePermissions.create)
  const [createOpen, setCreateOpen] = React.useState(false)

  const query = useQuery({
    queryKey: ['stocktake', 'list'],
    queryFn: () => api.stocktake.list(),
    enabled: canRead,
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['stocktake'] })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.stocktake.remove(id),
    onSuccess: () => {
      toast.success('Sayım silindi')
      void invalidate()
    },
    onError: (e) => toast.error('Silme başarısız', { description: toApiError(e).message }),
  })

  const columns: ColumnDef<StockCountDto>[] = [
    {
      id: 'name',
      accessorKey: 'name',
      header: 'Ad',
      size: 240,
      cell: ({ row }) => (
        <span className="font-medium">{row.original.name || '— (adsız)'}</span>
      ),
    },
    {
      id: 'kind',
      accessorKey: 'kind',
      header: 'Tür',
      size: 150,
      enableGrouping: true,
      cell: ({ row }) => (
        <Badge variant="secondary">{STOCK_COUNT_KIND_LABELS[row.original.kind]}</Badge>
      ),
    },
    {
      id: 'branch',
      accessorKey: 'branchName',
      header: 'Şube',
      size: 160,
      enableGrouping: true,
      cell: ({ row }) => (
        <span className="text-sm">{row.original.branchName || '—'}</span>
      ),
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: 'Durum',
      size: 120,
      enableGrouping: true,
      cell: ({ row }) => (
        <Badge variant={STATUS_TONE[row.original.status]}>
          {STOCK_COUNT_STATUS_LABELS[row.original.status]}
        </Badge>
      ),
    },
    {
      id: 'progress',
      header: 'Satır / Sayılan',
      size: 130,
      enableSorting: false,
      cell: ({ row }) => (
        <span className="font-mono text-sm tabular-nums">
          {row.original.countedCount} / {row.original.lineCount}
        </span>
      ),
    },
    {
      id: 'variance',
      accessorKey: 'varianceCount',
      header: 'Fark',
      size: 90,
      cell: ({ row }) =>
        row.original.varianceCount > 0 ? (
          <Badge variant="warning">{row.original.varianceCount}</Badge>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      id: 'date',
      accessorKey: 'plannedDate',
      header: 'Tarih',
      size: 120,
      cell: ({ row }) => (
        <span className="text-sm">
          {row.original.plannedDate ? formatDate(row.original.plannedDate) : formatDate(row.original.createdAt)}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      size: 64,
      enableSorting: false,
      enableHiding: false,
      enableColumnFilter: false,
      enableGrouping: false,
      cell: ({ row }) => {
        const c = row.original
        return (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="İşlemler"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation()
                    navigate({ to: '/stocktake/$id', params: { id: c.id } })
                  }}
                >
                  <Eye className="size-4" />
                  Görüntüle
                </DropdownMenuItem>

                {canCreate && c.status === 'draft' ? (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={(e) => {
                        e.stopPropagation()
                        if (confirm(`"${c.name || 'Adsız sayım'}" silinsin mi?`)) {
                          deleteMutation.mutate(c.id)
                        }
                      }}
                    >
                      <Trash2 className="size-4" />
                      Sil
                    </DropdownMenuItem>
                  </>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )
      },
    },
  ]

  return (
    <PermissionRequired permission={StocktakePermissions.read}>
      <PageWrapper>
        <DataGrid
          gridId="stocktake.list"
          data={query.data ?? []}
          columns={columns}
          getRowId={(row) => row.id}
          loading={query.isLoading}
          onRowClick={(row) => navigate({ to: '/stocktake/$id', params: { id: row.id } })}
          emptyText="Henüz sayım yok."
          toolbar={
            canCreate ? (
              <Button onClick={() => setCreateOpen(true)}>
                <Plus /> Yeni Sayım
              </Button>
            ) : null
          }
        />
        {canCreate ? (
          <StocktakeCreateDialog
            open={createOpen}
            onOpenChange={setCreateOpen}
            onCreated={(count) => navigate({ to: '/stocktake/$id', params: { id: count.id } })}
          />
        ) : null}
      </PageWrapper>
    </PermissionRequired>
  )
}
