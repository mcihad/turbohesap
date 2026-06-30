import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { HrPermissions, toApiError, type CheckinAreaDto } from '@turbohesap/shared'

import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth/auth-context'
import { PermissionRequired } from '@/lib/auth/permission-gate'
import { PageWrapper } from '@/components/layout/page'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataGrid, type ColumnDef } from '@/components/data-grid'
import { CheckinAreaDialog } from '../components/checkin-area-dialog'

function areaKind(a: CheckinAreaDto): string {
  if (!a.geom) return '—'
  return a.geom.type === 'Polygon' ? 'Poligon' : 'Nokta'
}

export function CheckinAreasPage() {
  const qc = useQueryClient()
  const { hasPermission } = useAuth()
  const canRead = hasPermission(HrPermissions.areasRead)
  const canWrite = hasPermission(HrPermissions.areasWrite)

  const areasQuery = useQuery({
    queryKey: ['hr', 'checkin-areas'],
    queryFn: () => api.hr.checkinAreas.list(),
    enabled: canRead,
  })
  const branchesQuery = useQuery({
    queryKey: ['org', 'branches'],
    queryFn: () => api.org.branches.list(),
    enabled: canRead,
  })
  const employeesQuery = useQuery({
    queryKey: ['hr', 'employees'],
    queryFn: () => api.hr.employees.list(),
    enabled: canRead,
  })

  const [open, setOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<CheckinAreaDto | null>(null)

  const invalidate = () => qc.invalidateQueries({ queryKey: ['hr', 'checkin-areas'] })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.hr.checkinAreas.remove(id),
    onSuccess: () => {
      toast.success('Giriş alanı silindi')
      void invalidate()
    },
    onError: (e) => toast.error('Silme başarısız', { description: toApiError(e).message }),
  })

  const areas = areasQuery.data ?? []

  const columns: ColumnDef<CheckinAreaDto>[] = [
    {
      id: 'name',
      accessorKey: 'name',
      header: 'Ad',
      size: 220,
      cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
    },
    {
      id: 'code',
      accessorKey: 'code',
      header: 'Kod',
      size: 110,
      cell: ({ row }) => <span className="font-mono text-xs">{row.original.code || '—'}</span>,
    },
    {
      id: 'kind',
      header: 'Tip',
      size: 110,
      enableGrouping: true,
      cell: ({ row }) => <Badge variant="secondary">{areaKind(row.original)}</Badge>,
    },
    {
      id: 'toleranceMeters',
      accessorKey: 'toleranceMeters',
      header: 'Tolerans (m)',
      size: 120,
      cell: ({ row }) => <span className="tabular-nums">{row.original.toleranceMeters}</span>,
    },
    {
      id: 'employeeCount',
      accessorKey: 'employeeCount',
      header: 'Personel',
      size: 100,
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.employeeCount > 0 ? row.original.employeeCount : 'Tümü'}
        </span>
      ),
    },
    {
      id: 'isActive',
      accessorKey: 'isActive',
      header: 'Durum',
      size: 100,
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
                    setEditing(row.original)
                    setOpen(true)
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
                    if (confirm(`"${row.original.name}" alanı silinsin mi?`))
                      deleteMutation.mutate(row.original.id)
                  }}
                  aria-label="Sil"
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            ),
          } as ColumnDef<CheckinAreaDto>,
        ]
      : []),
  ]

  return (
    <PermissionRequired permission={HrPermissions.areasRead}>
      <PageWrapper>
        <DataGrid
          gridId="hr.checkin-areas"
          data={areas}
          columns={columns}
          getRowId={(a) => a.id}
          loading={areasQuery.isLoading}
          onRowClick={
            canWrite
              ? (a) => {
                  setEditing(a)
                  setOpen(true)
                }
              : undefined
          }
          emptyText="Giriş alanı yok."
          toolbar={
            canWrite ? (
              <Button
                onClick={() => {
                  setEditing(null)
                  setOpen(true)
                }}
              >
                <Plus />
                Yeni Alan
              </Button>
            ) : null
          }
        />

        {open ? (
          <CheckinAreaDialog
            open={open}
            onOpenChange={setOpen}
            editing={editing}
            branches={branchesQuery.data ?? []}
            employees={employeesQuery.data ?? []}
            onSaved={invalidate}
          />
        ) : null}
      </PageWrapper>
    </PermissionRequired>
  )
}
