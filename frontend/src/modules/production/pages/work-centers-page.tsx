import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { ProductionPermissions, toApiError, type WorkCenterDto } from '@turbohesap/shared'

import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth/auth-context'
import { PermissionRequired } from '@/lib/auth/permission-gate'
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
import { WorkCenterDialog } from '../components/work-center-dialog'
import { formatMoney, formatMinutes } from '../format'

export function WorkCentersPage() {
  const qc = useQueryClient()
  const { hasPermission } = useAuth()
  const canRead = hasPermission(ProductionPermissions.read)
  const canWrite = hasPermission(ProductionPermissions.write)

  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<WorkCenterDto | null>(null)

  const query = useQuery({
    queryKey: ['production', 'work-centers'],
    queryFn: () => api.production.workCenters.list(),
    enabled: canRead,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.production.workCenters.remove(id),
    onSuccess: () => {
      toast.success('İş merkezi silindi')
      void qc.invalidateQueries({ queryKey: ['production', 'work-centers'] })
    },
    onError: (e) => toast.error('Silme başarısız', { description: toApiError(e).message }),
  })

  const openNew = () => {
    setEditing(null)
    setDialogOpen(true)
  }
  const openEdit = (wc: WorkCenterDto) => {
    setEditing(wc)
    setDialogOpen(true)
  }

  const columns: ColumnDef<WorkCenterDto>[] = [
    {
      id: 'code',
      accessorKey: 'code',
      header: 'Kod',
      size: 120,
      cell: ({ row }) => <span className="font-mono text-sm">{row.original.code}</span>,
    },
    {
      id: 'name',
      accessorKey: 'name',
      header: 'Ad',
      size: 240,
      cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
    },
    {
      id: 'cost',
      accessorKey: 'costPerHour',
      header: 'Saat Ücreti',
      size: 130,
      cell: ({ row }) => (
        <span className="tabular-nums">{formatMoney(row.original.costPerHour, row.original.currency)}</span>
      ),
    },
    {
      id: 'capacity',
      accessorKey: 'capacityPerHour',
      header: 'Kapasite/sa',
      size: 120,
      cell: ({ row }) => (
        <span className="tabular-nums">
          {row.original.capacityPerHour != null ? row.original.capacityPerHour : '—'}
        </span>
      ),
    },
    {
      id: 'setup',
      header: 'Hazırlık',
      size: 110,
      enableSorting: false,
      cell: ({ row }) => <span className="text-sm">{formatMinutes(row.original.setupTimeMinutes)}</span>,
    },
    {
      id: 'active',
      accessorKey: 'isActive',
      header: 'Durum',
      size: 100,
      enableGrouping: true,
      cell: ({ row }) =>
        row.original.isActive ? (
          <Badge variant="success">Aktif</Badge>
        ) : (
          <Badge variant="outline">Pasif</Badge>
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
        const wc = row.original
        return (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label="İşlemler" onClick={(e) => e.stopPropagation()}>
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                {canWrite ? (
                  <>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation()
                        openEdit(wc)
                      }}
                    >
                      <Pencil className="size-4" />
                      Düzenle
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={(e) => {
                        e.stopPropagation()
                        if (confirm(`"${wc.name}" silinsin mi?`)) deleteMutation.mutate(wc.id)
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
    <PermissionRequired permission={ProductionPermissions.read}>
      <PageWrapper>
        <DataGrid
          gridId="production.work-centers"
          data={query.data ?? []}
          columns={columns}
          getRowId={(row) => row.id}
          loading={query.isLoading}
          onRowClick={(row) => (canWrite ? openEdit(row) : undefined)}
          emptyText="Henüz iş merkezi yok."
          toolbar={
            canWrite ? (
              <Button onClick={openNew}>
                <Plus /> Yeni İş Merkezi
              </Button>
            ) : null
          }
        />
        <WorkCenterDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          editing={editing}
          onSaved={() => void query.refetch()}
        />
      </PageWrapper>
    </PermissionRequired>
  )
}
