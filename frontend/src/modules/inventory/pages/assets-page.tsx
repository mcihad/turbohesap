import * as React from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'

import {
  ASSET_STATUS_LABELS,
  InventoryPermissions,
  LookupsPermissions,
  type AssetDto,
  type AssetStatus,
} from '@turbohesap/shared'

import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth/auth-context'
import { PermissionRequired } from '@/lib/auth/permission-gate'
import { PageWrapper } from '@/components/layout/page'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataGrid, type ColumnDef } from '@/components/data-grid'
import { AssetDialog } from '../components/asset-dialog'

const STATUS_VARIANT: Record<AssetStatus, 'success' | 'secondary' | 'outline' | 'destructive'> = {
  depoda: 'secondary',
  zimmetli: 'success',
  bakimda: 'outline',
  kayip: 'destructive',
  hurda: 'destructive',
  cikis: 'outline',
  pasif: 'outline',
}

export function AssetsPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const canRead = hasPermission(InventoryPermissions.assetsRead)
  const canWrite = hasPermission(InventoryPermissions.assetsWrite)

  const assetsQuery = useQuery({
    queryKey: ['inventory', 'assets'],
    queryFn: () => api.inventory.assets.list(),
    enabled: canRead,
  })
  const lookupsQuery = useQuery({
    queryKey: ['lookups', 'items'],
    queryFn: () => api.lookups.list(),
    enabled: hasPermission(LookupsPermissions.read),
  })

  const [open, setOpen] = React.useState(false)

  const typeLabels = React.useMemo(() => {
    const map: Record<string, string> = {}
    for (const it of lookupsQuery.data ?? []) {
      if (it.list === 'asset_type') map[it.key] = it.value
    }
    return map
  }, [lookupsQuery.data])

  const assets = assetsQuery.data ?? []

  const columns: ColumnDef<AssetDto>[] = [
    { id: 'code', accessorKey: 'code', header: 'Kod', size: 130, cell: ({ row }) => <span className="font-mono text-xs">{row.original.code}</span> },
    { id: 'name', accessorKey: 'name', header: 'Ad', size: 220, cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
    {
      id: 'assetType', accessorFn: (a) => (a.assetTypeKey ? typeLabels[a.assetTypeKey] ?? a.assetTypeKey : ''),
      header: 'Tür', size: 140, enableGrouping: true,
      cell: ({ row }) => row.original.assetTypeKey ? (typeLabels[row.original.assetTypeKey] ?? row.original.assetTypeKey) : <span className="text-muted-foreground">—</span>,
    },
    {
      id: 'status', accessorFn: (a) => ASSET_STATUS_LABELS[a.status], header: 'Durum', size: 120, enableGrouping: true,
      cell: ({ row }) => <Badge variant={STATUS_VARIANT[row.original.status]}>{ASSET_STATUS_LABELS[row.original.status]}</Badge>,
    },
    {
      id: 'currentEmployee', accessorFn: (a) => a.currentEmployeeName ?? '', header: 'Kimde', size: 170,
      cell: ({ row }) => row.original.currentEmployeeName ?? <span className="text-muted-foreground">—</span>,
    },
    {
      id: 'brandModel', accessorFn: (a) => [a.brand, a.model].filter(Boolean).join(' '), header: 'Marka / Model', size: 170,
      cell: ({ row }) => {
        const v = [row.original.brand, row.original.model].filter(Boolean).join(' ')
        return v || <span className="text-muted-foreground">—</span>
      },
    },
    {
      id: 'plate', accessorFn: (a) => a.plate ?? '', header: 'Araç', size: 120,
      cell: ({ row }) => row.original.isVehicle && row.original.plate ? <span className="font-mono text-xs uppercase">{row.original.plate}</span> : <span className="text-muted-foreground">—</span>,
    },
    { id: 'isActive', accessorKey: 'isActive', header: 'Aktif', size: 90, enableGrouping: true, cell: ({ row }) => <Badge variant={row.original.isActive ? 'success' : 'outline'}>{row.original.isActive ? 'Aktif' : 'Pasif'}</Badge> },
  ]

  return (
    <PermissionRequired permission={InventoryPermissions.assetsRead}>
      <PageWrapper className="flex h-full flex-col">
        <DataGrid
          fillHeight
          gridId="inventory.assets"
          data={assets}
          columns={columns}
          getRowId={(a) => a.id}
          loading={assetsQuery.isLoading}
          onRowClick={(a) => navigate({ to: '/inventory/assets/$id', params: { id: a.id } })}
          emptyText="Demirbaş yok."
          toolbar={
            canWrite ? (
              <Button onClick={() => setOpen(true)}>
                <Plus />
                <span className="hidden sm:inline">Yeni Demirbaş</span>
              </Button>
            ) : null
          }
        />

        <AssetDialog
          open={open}
          onOpenChange={setOpen}
          editing={null}
          onSaved={() => qc.invalidateQueries({ queryKey: ['inventory', 'assets'] })}
        />
      </PageWrapper>
    </PermissionRequired>
  )
}
