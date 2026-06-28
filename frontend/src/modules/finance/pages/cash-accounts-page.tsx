import * as React from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Trash2, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import { FinancePermissions, toApiError, type CashAccountDto } from '@turbohesap/shared'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth/auth-context'
import { PermissionRequired } from '@/lib/auth/permission-gate'
import { PageWrapper } from '@/components/layout/page'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataGrid, type ColumnDef } from '@/components/data-grid'
import { CashAccountDialog } from '../components/cash-account-dialog'

export function formatMoney(val: number, currency: string = 'TRY'): string {
  try {
    const formatter = new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: currency,
    })
    return formatter.format(val)
  } catch {
    return `${val} ${currency}`
  }
}

export function CashAccountsPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { hasPermission } = useAuth()
  const canRead = hasPermission(FinancePermissions.cashAccountsRead)
  const canWrite = hasPermission(FinancePermissions.cashAccountsWrite)

  const query = useQuery({
    queryKey: ['finance', 'cash-accounts'],
    queryFn: () => api.finance.cashAccounts.list(),
    enabled: canRead,
  })

  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<CashAccountDto | null>(null)

  const invalidate = () => qc.invalidateQueries({ queryKey: ['finance', 'cash-accounts'] })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.finance.cashAccounts.remove(id),
    onSuccess: () => {
      toast.success('Kasa hesabı silindi')
      void invalidate()
    },
    onError: (e) => {
      toast.error('Silme başarısız', { description: toApiError(e).message })
    },
  })

  const handleCreate = () => {
    setEditing(null)
    setDialogOpen(true)
  }

  const handleEdit = (row: CashAccountDto) => {
    setEditing(row)
    setDialogOpen(true)
  }

  const handleDelete = (row: CashAccountDto) => {
    if (confirm(`"${row.name}" kasa hesabı silinsin mi?`)) {
      deleteMutation.mutate(row.id)
    }
  }

  const columns: ColumnDef<CashAccountDto>[] = [
    {
      id: 'name',
      accessorKey: 'name',
      header: 'Kasa Adı',
      size: 200,
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Wallet className="size-4 text-muted-foreground" />
          <span className="font-medium">{row.original.name}</span>
        </div>
      ),
    },
    {
      id: 'currency',
      accessorKey: 'currency',
      header: 'Para Birimi',
      size: 110,
      enableGrouping: true,
      cell: ({ row }) => <Badge variant="secondary">{row.original.currency}</Badge>,
    },
    {
      id: 'openingBalance',
      accessorKey: 'openingBalance',
      header: 'Açılış Tutarı',
      size: 140,
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">
          {formatMoney(row.original.openingBalance, row.original.currency)}
        </span>
      ),
    },
    {
      id: 'balance',
      accessorKey: 'balance',
      header: () => <div className="text-right">Güncel Bakiye</div>,
      size: 170,
      cell: ({ row }) => {
        const balance = row.original.balance
        return (
          <div
            className={`text-right font-mono font-semibold tabular-nums ${
              balance >= 0 ? 'text-emerald-600' : 'text-red-600'
            }`}
          >
            {formatMoney(balance, row.original.currency)}
          </div>
        )
      },
    },
    {
      id: 'description',
      accessorKey: 'description',
      header: 'Açıklama',
      size: 250,
      cell: ({ row }) => (
        <span className="text-muted-foreground text-xs">{row.original.description || '—'}</span>
      ),
    },
    {
      id: 'isActive',
      accessorKey: 'isActive',
      header: 'Durum',
      size: 110,
      enableGrouping: true,
      cell: ({ row }) => (
        <Badge variant={row.original.isActive ? 'success' : 'outline'}>
          {row.original.isActive ? 'Aktif' : 'Pasif'}
        </Badge>
      ),
    },
    ...(canWrite
      ? [
          {
            id: 'actions',
            header: '',
            size: 90,
            enableSorting: false,
            enableHiding: false,
            enableColumnFilter: false,
            enableGrouping: false,
            cell: ({ row }) => (
              <div className="flex justify-end gap-1">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleEdit(row.original)
                  }}
                  aria-label="Düzenle"
                >
                  <Pencil className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete(row.original)
                  }}
                  aria-label="Sil"
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            ),
          } as ColumnDef<CashAccountDto>,
        ]
      : []),
  ]

  return (
    <PermissionRequired permission={FinancePermissions.cashAccountsRead}>
      <PageWrapper>
        <DataGrid
          gridId="finance.cashAccounts"
          data={query.data ?? []}
          columns={columns}
          getRowId={(row) => row.id}
          loading={query.isLoading}
          onRowClick={(row) => navigate({ to: '/finance/cash-accounts/$id', params: { id: row.id } })}
          emptyText="Kasa hesabı yok."
          toolbar={
            canWrite ? (
              <Button onClick={handleCreate}>
                <Plus /> Yeni Kasa
              </Button>
            ) : null
          }
        />

        <CashAccountDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          editing={editing}
          onSuccess={invalidate}
        />
      </PageWrapper>
    </PermissionRequired>
  )
}
