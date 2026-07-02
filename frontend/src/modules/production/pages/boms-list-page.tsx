import { useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Eye, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import {
  BOM_TYPE_LABELS,
  ProductionPermissions,
  toApiError,
  type BomDto,
} from '@turbohesap/shared'

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

export function BomsListPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { hasPermission } = useAuth()
  const canRead = hasPermission(ProductionPermissions.read)
  const canWrite = hasPermission(ProductionPermissions.write)

  const query = useQuery({
    queryKey: ['production', 'boms', 'list'],
    queryFn: () => api.production.boms.list(),
    enabled: canRead,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.production.boms.remove(id),
    onSuccess: () => {
      toast.success('Reçete silindi')
      void qc.invalidateQueries({ queryKey: ['production', 'boms'] })
    },
    onError: (e) => toast.error('Silme başarısız', { description: toApiError(e).message }),
  })

  const columns: ColumnDef<BomDto>[] = [
    {
      id: 'code',
      accessorKey: 'code',
      header: 'Kod',
      size: 130,
      cell: ({ row }) => <span className="font-mono text-sm">{row.original.code}</span>,
    },
    {
      id: 'product',
      accessorKey: 'productName',
      header: 'Mamul',
      size: 240,
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.productName}</div>
          <div className="font-mono text-2xs text-muted-foreground">{row.original.productCode}</div>
        </div>
      ),
    },
    {
      id: 'name',
      accessorKey: 'name',
      header: 'Reçete Adı',
      size: 200,
      cell: ({ row }) => <span className="text-sm">{row.original.name || '—'}</span>,
    },
    {
      id: 'type',
      accessorKey: 'type',
      header: 'Tür',
      size: 150,
      enableGrouping: true,
      cell: ({ row }) => <Badge variant="secondary">{BOM_TYPE_LABELS[row.original.type]}</Badge>,
    },
    {
      id: 'output',
      header: 'Çıktı',
      size: 110,
      enableSorting: false,
      cell: ({ row }) => (
        <span className="tabular-nums">
          {row.original.outputQuantity} {row.original.unit}
        </span>
      ),
    },
    {
      id: 'version',
      accessorKey: 'version',
      header: 'Sürüm',
      size: 90,
      cell: ({ row }) => <span className="tabular-nums">v{row.original.version}</span>,
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
        const b = row.original
        return (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label="İşlemler" onClick={(e) => e.stopPropagation()}>
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation()
                    navigate({ to: '/production/boms/$id', params: { id: b.id } })
                  }}
                >
                  {canWrite ? <Pencil className="size-4" /> : <Eye className="size-4" />}
                  {canWrite ? 'Düzenle' : 'Görüntüle'}
                </DropdownMenuItem>
                {canWrite ? (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={(e) => {
                        e.stopPropagation()
                        if (confirm(`"${b.code}" reçetesi silinsin mi?`)) deleteMutation.mutate(b.id)
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
          gridId="production.boms"
          data={query.data ?? []}
          columns={columns}
          getRowId={(row) => row.id}
          loading={query.isLoading}
          onRowClick={(row) => navigate({ to: '/production/boms/$id', params: { id: row.id } })}
          emptyText="Henüz reçete yok."
          toolbar={
            canWrite ? (
              <Button onClick={() => navigate({ to: '/production/boms/new' })}>
                <Plus /> Yeni Reçete
              </Button>
            ) : null
          }
        />
      </PageWrapper>
    </PermissionRequired>
  )
}
