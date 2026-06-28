import * as React from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Flame, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import {
  ContactsPermissions,
  toApiError,
  type OpportunityDto,
} from '@turbohesap/shared'

import { api } from '@/lib/api'
import { formatDate } from '@/lib/datetime'
import { useAuth } from '@/lib/auth/auth-context'
import { PermissionRequired } from '@/lib/auth/permission-gate'
import { PageWrapper } from '@/components/layout/page'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataGrid, type ColumnDef } from '@/components/data-grid'
import { formatMoney } from '../format'
import { OpportunityDialog } from '../components/opportunity-dialog'
import { OpportunitiesBulkBar } from '../components/bulk-actions-bar'

export function OpportunitiesPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const canRead = hasPermission(ContactsPermissions.opportunitiesRead)
  const canWrite = hasPermission(ContactsPermissions.opportunitiesWrite)

  const query = useQuery({
    queryKey: ['contacts', 'opportunities'],
    queryFn: () => api.contacts.opportunities.list(),
    enabled: canRead,
  })

  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<OpportunityDto | null>(null)
  const [selected, setSelected] = React.useState<OpportunityDto[]>([])
  // Bumping this remounts the grid, which clears its internal row selection.
  const [gridKey, setGridKey] = React.useState(0)
  const clearSelection = React.useCallback(() => {
    setSelected([])
    setGridKey((k) => k + 1)
  }, [])

  const invalidate = () => qc.invalidateQueries({ queryKey: ['contacts', 'opportunities'] })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.contacts.opportunities.remove(id),
    onSuccess: () => {
      toast.success('Fırsat silindi')
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

  const handleEdit = (row: OpportunityDto) => {
    setEditing(row)
    setDialogOpen(true)
  }

  const handleDelete = (row: OpportunityDto) => {
    if (confirm(`"${row.name}" fırsatı silinsin mi?`)) {
      deleteMutation.mutate(row.id)
    }
  }

  const columns: ColumnDef<OpportunityDto>[] = [
    {
      id: 'name',
      accessorKey: 'name',
      header: 'Fırsat',
      size: 220,
      cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
    },
    {
      id: 'contact',
      accessorFn: (o) => o.contact?.name ?? '',
      header: 'Cari',
      size: 180,
      enableGrouping: true,
      cell: ({ row }) =>
        row.original.contact ? (
          <Badge variant="secondary">{row.original.contact.name}</Badge>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      id: 'stage',
      accessorFn: (o) => o.stageName,
      header: 'Aşama',
      size: 150,
      enableGrouping: true,
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <span
            className="inline-block size-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: row.original.stageColor }}
          />
          <span>{row.original.stageName}</span>
          {row.original.isRotting ? (
            <Flame className="size-3.5 text-destructive" aria-label="Bekliyor" />
          ) : null}
        </div>
      ),
    },
    {
      id: 'owner',
      accessorFn: (o) => o.owner?.name ?? '',
      header: 'Sorumlu',
      size: 150,
      enableGrouping: true,
      cell: ({ row }) =>
        row.original.owner ? (
          <span>{row.original.owner.name}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      id: 'amount',
      accessorKey: 'amount',
      header: 'Tutar',
      size: 140,
      cell: ({ row }) => (
        <span className="font-mono text-sm tabular-nums">
          {formatMoney(row.original.amount, row.original.currencyCode)}
        </span>
      ),
    },
    {
      id: 'probability',
      accessorKey: 'probability',
      header: 'Olasılık',
      size: 100,
      cell: ({ row }) => <span className="tabular-nums">%{row.original.probability}</span>,
    },
    {
      id: 'expectedRevenue',
      accessorKey: 'expectedRevenue',
      header: 'Tahmini Ciro',
      size: 150,
      cell: ({ row }) => (
        <span className="font-mono text-sm font-bold tabular-nums">
          {formatMoney(row.original.expectedRevenue, row.original.currencyCode)}
        </span>
      ),
    },
    {
      id: 'expectedCloseDate',
      accessorKey: 'expectedCloseDate',
      header: 'Tahmini Kapanış',
      size: 150,
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm">
          {row.original.expectedCloseDate ? formatDate(row.original.expectedCloseDate) : '—'}
        </span>
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
          } as ColumnDef<OpportunityDto>,
        ]
      : []),
  ]

  return (
    <PermissionRequired permission={ContactsPermissions.opportunitiesRead}>
      <PageWrapper>
        <DataGrid
          key={gridKey}
          gridId="contacts.opportunities"
          data={query.data ?? []}
          columns={columns}
          getRowId={(row) => row.id}
          loading={query.isLoading}
          selection={canWrite ? 'multi' : 'none'}
          onSelectionChange={setSelected}
          onRowClick={(row) =>
            navigate({ to: '/contacts/opportunities/$id', params: { id: row.id } })
          }
          emptyText="Fırsat yok."
          toolbar={
            canWrite ? (
              <Button onClick={handleCreate}>
                <Plus /> Yeni fırsat
              </Button>
            ) : null
          }
        />

        {canWrite && selected.length > 0 ? (
          <OpportunitiesBulkBar ids={selected.map((o) => o.id)} onCleared={clearSelection} />
        ) : null}

        <OpportunityDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          editing={editing}
          onSaved={() => void invalidate()}
        />
      </PageWrapper>
    </PermissionRequired>
  )
}
