import { useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight } from 'lucide-react'

import { InventoryPermissions, type AssetAssignmentDto } from '@turbohesap/shared'

import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth/auth-context'
import { PermissionRequired } from '@/lib/auth/permission-gate'
import { formatDateTime } from '@/lib/datetime'
import { PageWrapper } from '@/components/layout/page'
import { Button } from '@/components/ui/button'
import { DataGrid, type ColumnDef } from '@/components/data-grid'

/** "Kimde ne var" board — all ACTIVE zimmetler across assets. */
export function AssignmentsPage() {
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const canRead = hasPermission(InventoryPermissions.assetsRead)

  const query = useQuery({
    queryKey: ['inventory', 'asset-assignments', 'active'],
    queryFn: () => api.inventory.assetAssignments.list({ status: 'active' }),
    enabled: canRead,
  })

  const rows = query.data ?? []

  const goToAsset = (assetId: string) =>
    navigate({ to: '/inventory/assets/$id', params: { id: assetId } })

  const columns: ColumnDef<AssetAssignmentDto>[] = [
    {
      id: 'asset', accessorFn: (a) => (a.asset ? `${a.asset.code} ${a.asset.name}` : ''), header: 'Demirbaş', size: 280,
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium">{row.original.asset?.name ?? '—'}</span>
          <span className="font-mono text-xs text-muted-foreground">{row.original.asset?.code ?? ''}</span>
        </div>
      ),
    },
    { id: 'employee', accessorKey: 'employeeName', header: 'Kimde', size: 200, cell: ({ row }) => <span className="font-medium">{row.original.employeeName}</span> },
    { id: 'assignedAt', accessorFn: (a) => a.assignedAt, header: 'Zimmet tarihi', size: 180, cell: ({ row }) => <span className="text-muted-foreground">{formatDateTime(row.original.assignedAt)}</span> },
    { id: 'assignedBy', accessorFn: (a) => a.assignedByName ?? '', header: 'Veren', size: 160, cell: ({ row }) => <span className="text-muted-foreground">{row.original.assignedByName ?? '—'}</span> },
    {
      id: 'actions', header: '', size: 130, enableSorting: false, enableHiding: false, enableColumnFilter: false, enableGrouping: false,
      cell: ({ row }) => (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); goToAsset(row.original.assetId) }}>
            Demirbaş <ArrowRight className="size-4" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <PermissionRequired permission={InventoryPermissions.assetsRead}>
      <PageWrapper className="flex h-full flex-col">
        <DataGrid
          fillHeight
          gridId="inventory.assignments"
          data={rows}
          columns={columns}
          getRowId={(a) => a.id}
          loading={query.isLoading}
          onRowClick={(a) => goToAsset(a.assetId)}
          emptyText="Aktif zimmet yok."
        />
      </PageWrapper>
    </PermissionRequired>
  )
}
