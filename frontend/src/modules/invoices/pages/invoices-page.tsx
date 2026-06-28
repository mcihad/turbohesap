import { useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Ban, Eye, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import {
  InvoicesPermissions,
  toApiError,
  type InvoiceStatus,
  type InvoiceType,
  type InvoiceDto,
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

const TYPE_LABEL: Record<InvoiceType, string> = {
  sales: 'Satış',
  purchase: 'Alış',
  return: 'İade',
}

const STATUS_LABEL: Record<InvoiceStatus, string> = {
  draft: 'Taslak',
  issued: 'Kesildi',
  paid: 'Ödendi',
  cancelled: 'İptal',
}

const STATUS_TONE: Record<InvoiceStatus, 'outline' | 'success' | 'info' | 'destructive'> = {
  draft: 'outline',
  issued: 'success',
  paid: 'info',
  cancelled: 'destructive',
}

const EDOC_LABEL: Record<string, string> = {
  efatura: 'e-Fatura',
  earsiv: 'e-Arşiv',
  none: '—',
}

export function InvoicesPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { hasPermission } = useAuth()
  const canRead = hasPermission(InvoicesPermissions.read)
  const canWrite = hasPermission(InvoicesPermissions.write)

  const query = useQuery({
    queryKey: ['invoices', 'list'],
    queryFn: () => api.invoices.list(),
    enabled: canRead,
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['invoices'] })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.invoices.remove(id),
    onSuccess: () => {
      toast.success('Fatura silindi')
      void invalidate()
    },
    onError: (e) => toast.error('Silme başarısız', { description: toApiError(e).message }),
  })

  const cancelMutation = useMutation({
    mutationFn: (id: string) => api.invoices.cancel(id),
    onSuccess: () => {
      toast.success('Fatura iptal edildi')
      void invalidate()
    },
    onError: (e) => toast.error('İptal başarısız', { description: toApiError(e).message }),
  })

  const label = (inv: InvoiceDto) => `${inv.series}${inv.number || ' (taslak)'}`

  const columns: ColumnDef<InvoiceDto>[] = [
    {
      id: 'number',
      accessorKey: 'number',
      header: 'No',
      size: 140,
      cell: ({ row }) => {
        const inv = row.original
        return (
          <span className="font-mono text-sm">
            {inv.number ? `${inv.series}${inv.number}` : '— (taslak)'}
          </span>
        )
      },
    },
    {
      id: 'type',
      accessorKey: 'type',
      header: 'Tip',
      size: 100,
      enableGrouping: true,
      cell: ({ row }) => <Badge variant="secondary">{TYPE_LABEL[row.original.type]}</Badge>,
    },
    {
      id: 'contact',
      accessorFn: (i) => i.contact?.name ?? '',
      header: 'Cari',
      size: 220,
      cell: ({ row }) => (
        <span className="font-medium">{row.original.contact?.name ?? '—'}</span>
      ),
    },
    {
      id: 'date',
      accessorKey: 'date',
      header: 'Tarih',
      size: 120,
      cell: ({ row }) => <span className="text-sm">{formatDate(row.original.date)}</span>,
    },
    {
      id: 'dueDate',
      accessorKey: 'dueDate',
      header: 'Vade',
      size: 120,
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.dueDate ? formatDate(row.original.dueDate) : '—'}
        </span>
      ),
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: 'Durum',
      size: 110,
      enableGrouping: true,
      cell: ({ row }) => (
        <Badge variant={STATUS_TONE[row.original.status]}>
          {STATUS_LABEL[row.original.status]}
        </Badge>
      ),
    },
    {
      id: 'paymentStatus',
      header: 'Ödeme',
      size: 120,
      enableGrouping: true,
      accessorFn: (i) => (i.remainingTotal <= 0 ? 'paid' : i.paidTotal > 0 ? 'partial' : 'unpaid'),
      cell: ({ row }) => {
        const i = row.original
        if (i.status !== 'issued' && i.status !== 'paid') return <span className="text-muted-foreground">—</span>
        if (i.remainingTotal <= 0) return <Badge variant="success">Ödendi</Badge>
        if (i.paidTotal > 0) return <Badge variant="info">Kısmi</Badge>
        return <Badge variant="outline">Ödenmedi</Badge>
      },
    },
    { id: 'series', accessorKey: 'series', header: 'Seri', size: 100, cell: ({ row }) => <span className="font-mono text-xs text-muted-foreground">{row.original.series || '—'}</span> },
    { id: 'faturaTipi', accessorKey: 'faturaTipi', header: 'Fatura Tipi', size: 120, enableGrouping: true, cell: ({ row }) => <Badge variant="outline">{row.original.faturaTipi}</Badge> },
    { id: 'senaryo', accessorKey: 'senaryo', header: 'Senaryo', size: 130, enableGrouping: true, cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original.senaryo}</span> },
    { id: 'eDocType', accessorKey: 'eDocType', header: 'e-Belge', size: 100, enableGrouping: true, cell: ({ row }) => <span className="text-xs">{EDOC_LABEL[row.original.eDocType] ?? '—'}</span> },
    { id: 'currency', accessorKey: 'currencyCode', header: 'Döviz', size: 80, enableGrouping: true, cell: ({ row }) => <span className="text-xs">{row.original.currencyCode}</span> },
    { id: 'subtotal', accessorKey: 'subtotal', header: 'Ara Toplam', size: 130, cell: ({ row }) => <div className="text-right font-mono tabular-nums">{formatMoney(row.original.subtotal, row.original.currencyCode)}</div> },
    { id: 'discountTotal', accessorKey: 'discountTotal', header: 'İskonto', size: 120, cell: ({ row }) => <div className="text-right font-mono tabular-nums">{formatMoney(row.original.discountTotal, row.original.currencyCode)}</div> },
    { id: 'vatBase', accessorKey: 'vatBase', header: 'KDV Matrah', size: 130, cell: ({ row }) => <div className="text-right font-mono tabular-nums">{formatMoney(row.original.vatBase, row.original.currencyCode)}</div> },
    { id: 'vatTotal', accessorKey: 'vatTotal', header: 'KDV', size: 120, cell: ({ row }) => <div className="text-right font-mono tabular-nums">{formatMoney(row.original.vatTotal, row.original.currencyCode)}</div> },
    { id: 'withholdingTotal', accessorKey: 'withholdingTotal', header: 'Tevkifat', size: 120, cell: ({ row }) => <div className="text-right font-mono tabular-nums">{formatMoney(row.original.withholdingTotal, row.original.currencyCode)}</div> },
    {
      id: 'grandTotal',
      accessorKey: 'grandTotal',
      header: 'Genel Toplam',
      size: 150,
      cell: ({ row }) => (
        <div className="text-right font-mono font-semibold tabular-nums">
          {formatMoney(row.original.grandTotal, row.original.currencyCode)}
        </div>
      ),
    },
    { id: 'paidTotal', accessorKey: 'paidTotal', header: 'Ödenen', size: 130, cell: ({ row }) => <div className="text-right font-mono tabular-nums text-emerald-600">{formatMoney(row.original.paidTotal, row.original.currencyCode)}</div> },
    { id: 'remainingTotal', accessorKey: 'remainingTotal', header: 'Kalan', size: 130, cell: ({ row }) => <div className="text-right font-mono tabular-nums">{formatMoney(row.original.remainingTotal, row.original.currencyCode)}</div> },
    {
      id: 'actions',
      header: '',
      size: 64,
      enableSorting: false,
      enableHiding: false,
      enableColumnFilter: false,
      enableGrouping: false,
      cell: ({ row }) => {
        const inv = row.original
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
                    navigate({ to: '/invoices/invoices/$id', params: { id: inv.id } })
                  }}
                >
                  <Eye className="size-4" />
                  Görüntüle
                </DropdownMenuItem>

                {canWrite && inv.status === 'draft' ? (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate({ to: '/invoices/invoices/$id/edit', params: { id: inv.id } })
                      }}
                    >
                      <Pencil className="size-4" />
                      Düzenle
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={(e) => {
                        e.stopPropagation()
                        if (confirm(`"${label(inv)}" faturası silinsin mi?`)) {
                          deleteMutation.mutate(inv.id)
                        }
                      }}
                    >
                      <Trash2 className="size-4" />
                      Sil
                    </DropdownMenuItem>
                  </>
                ) : null}

                {canWrite && inv.status === 'issued' ? (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={(e) => {
                        e.stopPropagation()
                        if (confirm(`"${label(inv)}" faturası iptal edilsin mi?`)) {
                          cancelMutation.mutate(inv.id)
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
    <PermissionRequired permission={InvoicesPermissions.read}>
      <PageWrapper>
        <DataGrid
          gridId="invoices.list"
          data={query.data ?? []}
          columns={columns}
          getRowId={(row) => row.id}
          loading={query.isLoading}
          onRowClick={(row) => navigate({ to: '/invoices/invoices/$id', params: { id: row.id } })}
          emptyText="Fatura yok."
          toolbar={
            canWrite ? (
              <Button onClick={() => navigate({ to: '/invoices/invoices/new' })}>
                <Plus /> Yeni Fatura
              </Button>
            ) : null
          }
        />
      </PageWrapper>
    </PermissionRequired>
  )
}
