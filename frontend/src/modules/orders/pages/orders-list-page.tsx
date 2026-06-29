import { useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Ban, Check, Eye, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import {
  ORDER_DIRECTION_LABELS,
  ORDER_STATUS_LABELS,
  OrdersPermissions,
  toApiError,
  type OrderDirection,
  type OrderDocumentSummary,
  type OrderKind,
  type OrderStatus,
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
import { formatMoney } from '../format'

const STATUS_TONE: Record<OrderStatus, 'outline' | 'success' | 'info' | 'destructive'> = {
  draft: 'outline',
  confirmed: 'success',
  shipped: 'info',
  invoiced: 'info',
  cancelled: 'destructive',
}

// "Yeni" preset per list — quotes default to a quote, the orders list to an
// order, the deliveries list to a delivery; direction defaults to sales.
const NEW_DEFAULT_DIRECTION: OrderDirection = 'sales'

export function OrdersListPage({
  kind,
  emptyText,
  newLabel,
}: {
  kind: OrderKind
  emptyText: string
  newLabel: string
}) {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { hasPermission } = useAuth()
  const canRead = hasPermission(OrdersPermissions.read)
  const canWrite = hasPermission(OrdersPermissions.write)
  const canCancel = hasPermission(OrdersPermissions.cancel)

  const query = useQuery({
    queryKey: ['orders', 'list', kind],
    queryFn: () => api.orders.list({ kind }),
    enabled: canRead,
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['orders'] })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.orders.remove(id),
    onSuccess: () => {
      toast.success('Belge silindi')
      void invalidate()
    },
    onError: (e) => toast.error('Silme başarısız', { description: toApiError(e).message }),
  })

  const cancelMutation = useMutation({
    mutationFn: (id: string) => api.orders.cancel(id),
    onSuccess: () => {
      toast.success('Belge iptal edildi')
      void invalidate()
    },
    onError: (e) => toast.error('İptal başarısız', { description: toApiError(e).message }),
  })

  const docLabel = (d: OrderDocumentSummary) => (d.number ? `${d.series}${d.number}` : '— (taslak)')

  const columns: ColumnDef<OrderDocumentSummary>[] = [
    {
      id: 'number',
      accessorKey: 'number',
      header: 'Belge No',
      size: 150,
      cell: ({ row }) => (
        <span className="font-mono text-sm">{docLabel(row.original)}</span>
      ),
    },
    {
      id: 'direction',
      accessorKey: 'direction',
      header: 'Tip',
      size: 110,
      enableGrouping: true,
      cell: ({ row }) => (
        <Badge variant="secondary">{ORDER_DIRECTION_LABELS[row.original.direction]}</Badge>
      ),
    },
    {
      id: 'contact',
      accessorKey: 'contactName',
      header: 'Cari',
      size: 220,
      cell: ({ row }) => <span className="font-medium">{row.original.contactName || '—'}</span>,
    },
    {
      id: 'date',
      accessorKey: 'date',
      header: 'Tarih',
      size: 120,
      cell: ({ row }) => <span className="text-sm">{formatDate(row.original.date)}</span>,
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: 'Durum',
      size: 120,
      enableGrouping: true,
      cell: ({ row }) => (
        <Badge variant={STATUS_TONE[row.original.status]}>
          {ORDER_STATUS_LABELS[row.original.status]}
        </Badge>
      ),
    },
    {
      id: 'invoiced',
      header: 'Faturalı',
      size: 90,
      enableGrouping: true,
      accessorFn: (d) => (d.invoiceId ? 'evet' : 'hayir'),
      cell: ({ row }) =>
        row.original.invoiceId ? (
          <Check className="size-4 text-emerald-600" />
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    { id: 'currency', accessorKey: 'currencyCode', header: 'Döviz', size: 80, enableGrouping: true, cell: ({ row }) => <span className="text-xs">{row.original.currencyCode}</span> },
    {
      id: 'grandTotal',
      accessorKey: 'grandTotal',
      header: 'Tutar',
      size: 150,
      cell: ({ row }) => (
        <div className="text-right font-mono font-semibold tabular-nums">
          {formatMoney(row.original.grandTotal, row.original.currencyCode)}
        </div>
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
        const doc = row.original
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
                    navigate({ to: '/orders/$id', params: { id: doc.id } })
                  }}
                >
                  <Eye className="size-4" />
                  Görüntüle
                </DropdownMenuItem>

                {canWrite && doc.status === 'draft' ? (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate({ to: '/orders/$id/edit', params: { id: doc.id } })
                      }}
                    >
                      <Pencil className="size-4" />
                      Düzenle
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={(e) => {
                        e.stopPropagation()
                        if (confirm(`"${docLabel(doc)}" belgesi silinsin mi?`)) {
                          deleteMutation.mutate(doc.id)
                        }
                      }}
                    >
                      <Trash2 className="size-4" />
                      Sil
                    </DropdownMenuItem>
                  </>
                ) : null}

                {canCancel && doc.status !== 'draft' && doc.status !== 'cancelled' && doc.status !== 'invoiced' ? (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={(e) => {
                        e.stopPropagation()
                        if (confirm(`"${docLabel(doc)}" belgesi iptal edilsin mi?`)) {
                          cancelMutation.mutate(doc.id)
                        }
                      }}
                    >
                      <Ban className="size-4" />
                      İptal
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
    <PermissionRequired permission={OrdersPermissions.read}>
      <PageWrapper>
        <DataGrid
          gridId={`orders.list.${kind}`}
          data={query.data ?? []}
          columns={columns}
          getRowId={(row) => row.id}
          loading={query.isLoading}
          onRowClick={(row) => navigate({ to: '/orders/$id', params: { id: row.id } })}
          emptyText={emptyText}
          toolbar={
            canWrite ? (
              <Button
                onClick={() =>
                  navigate({ to: '/orders/new', search: { kind, direction: NEW_DEFAULT_DIRECTION } })
                }
              >
                <Plus /> {newLabel}
              </Button>
            ) : null
          }
        />
      </PageWrapper>
    </PermissionRequired>
  )
}

// Thin per-kind wrappers used by the route files.
export const QuotesListPage = () => (
  <OrdersListPage kind="quote" emptyText="Teklif yok." newLabel="Yeni Teklif" />
)
export const SalesOrdersListPage = () => (
  <OrdersListPage kind="order" emptyText="Sipariş yok." newLabel="Yeni Sipariş" />
)
export const DeliveriesListPage = () => (
  <OrdersListPage kind="delivery" emptyText="İrsaliye yok." newLabel="Yeni İrsaliye" />
)
