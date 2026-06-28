import * as React from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Landmark, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { FinancePermissions, toApiError, type BankAccountDto } from '@turbohesap/shared'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth/auth-context'
import { PermissionRequired } from '@/lib/auth/permission-gate'
import { PageWrapper } from '@/components/layout/page'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataGrid, type ColumnDef } from '@/components/data-grid'
import { BankAccountDialog } from '../components/bank-account-dialog'
import { formatMoney } from './cash-accounts-page'

// Custom formatter to show IBAN nicely in tables: TRxx xxxx xxxx xxxx xxxx xxxx xx
export function formatIbanForDisplay(iban: string): string {
  if (!iban) return ''
  const clean = iban.replace(/\s/g, '').toUpperCase()
  const parts = []
  if (clean.length > 0) {
    parts.push(clean.substring(0, 4))
  }
  for (let i = 4; i < clean.length; i += 4) {
    parts.push(clean.substring(i, i + 4))
  }
  return parts.join(' ')
}

export function BankAccountsPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { hasPermission } = useAuth()
  const canRead = hasPermission(FinancePermissions.bankAccountsRead)
  const canWrite = hasPermission(FinancePermissions.bankAccountsWrite)

  const query = useQuery({
    queryKey: ['finance', 'bank-accounts'],
    queryFn: () => api.finance.bankAccounts.list(),
    enabled: canRead,
  })

  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<BankAccountDto | null>(null)

  const invalidate = () => qc.invalidateQueries({ queryKey: ['finance', 'bank-accounts'] })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.finance.bankAccounts.remove(id),
    onSuccess: () => {
      toast.success('Banka hesabı silindi')
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

  const handleEdit = (row: BankAccountDto) => {
    setEditing(row)
    setDialogOpen(true)
  }

  const handleDelete = (row: BankAccountDto) => {
    if (confirm(`"${row.name}" banka hesabı silinsin mi?`)) {
      deleteMutation.mutate(row.id)
    }
  }

  const columns: ColumnDef<BankAccountDto>[] = [
    {
      id: 'name',
      accessorKey: 'name',
      header: 'Hesap Adı',
      size: 180,
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Landmark className="size-4 text-muted-foreground" />
          <span className="font-medium">{row.original.name}</span>
        </div>
      ),
    },
    {
      id: 'bankName',
      accessorKey: 'bankName',
      header: 'Banka',
      size: 120,
      enableGrouping: true,
      cell: ({ row }) => <span>{row.original.bankName}</span>,
    },
    {
      id: 'branch',
      header: 'Şube/Hesap No',
      size: 160,
      cell: ({ row }) => (
        <div className="flex flex-col text-xs">
          <span>
            {row.original.branchName || '—'}
            {row.original.branchCode ? ` (${row.original.branchCode})` : ''}
          </span>
          <span className="text-muted-foreground">{row.original.accountNumber || '—'}</span>
        </div>
      ),
    },
    {
      id: 'iban',
      accessorKey: 'iban',
      header: 'IBAN',
      size: 220,
      cell: ({ row }) => (
        <span className="font-mono text-xs select-all">
          {formatIbanForDisplay(row.original.iban)}
        </span>
      ),
    },
    {
      id: 'currency',
      accessorKey: 'currency',
      header: 'Birim',
      size: 90,
      enableGrouping: true,
      cell: ({ row }) => <Badge variant="secondary">{row.original.currency}</Badge>,
    },
    {
      id: 'openingBalance',
      accessorKey: 'openingBalance',
      header: 'Açılış Tutarı',
      size: 130,
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
          } as ColumnDef<BankAccountDto>,
        ]
      : []),
  ]

  return (
    <PermissionRequired permission={FinancePermissions.bankAccountsRead}>
      <PageWrapper>
        <DataGrid
          gridId="finance.bankAccounts"
          data={query.data ?? []}
          columns={columns}
          getRowId={(row) => row.id}
          loading={query.isLoading}
          onRowClick={(row) => navigate({ to: '/finance/bank-accounts/$id', params: { id: row.id } })}
          emptyText="Banka hesabı yok."
          toolbar={
            canWrite ? (
              <Button onClick={handleCreate}>
                <Plus /> Yeni Hesap
              </Button>
            ) : null
          }
        />

        <BankAccountDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          editing={editing}
          onSuccess={invalidate}
        />
      </PageWrapper>
    </PermissionRequired>
  )
}
