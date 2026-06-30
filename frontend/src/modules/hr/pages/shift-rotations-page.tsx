import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { HrPermissions, toApiError, type ShiftRotationDto } from '@turbohesap/shared'

import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth/auth-context'
import { PermissionRequired } from '@/lib/auth/permission-gate'
import { PageWrapper } from '@/components/layout/page'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataGrid, type ColumnDef } from '@/components/data-grid'
import { RotationDialog } from '../components/rotation-dialog'

export function ShiftRotationsPage() {
  const qc = useQueryClient()
  const { hasPermission } = useAuth()
  const canRead = hasPermission(HrPermissions.shiftsRead)
  const canWrite = hasPermission(HrPermissions.shiftsWrite)

  const rotationsQuery = useQuery({
    queryKey: ['hr', 'shift-rotations'],
    queryFn: () => api.hr.shiftRotations.list(),
    enabled: canRead,
  })
  const shiftsQuery = useQuery({
    queryKey: ['hr', 'shifts'],
    queryFn: () => api.hr.shifts.list(),
    enabled: canRead,
  })

  const [open, setOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<ShiftRotationDto | null>(null)

  const invalidate = () => qc.invalidateQueries({ queryKey: ['hr', 'shift-rotations'] })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.hr.shiftRotations.remove(id),
    onSuccess: () => {
      toast.success('Rotasyon silindi')
      void invalidate()
    },
    onError: (e) => toast.error('Silme başarısız', { description: toApiError(e).message }),
  })

  const rotations = rotationsQuery.data ?? []

  const columns: ColumnDef<ShiftRotationDto>[] = [
    {
      id: 'name',
      accessorKey: 'name',
      header: 'Ad',
      size: 220,
      cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
    },
    {
      id: 'cycleLengthDays',
      accessorKey: 'cycleLengthDays',
      header: 'Döngü (gün)',
      size: 120,
      cell: ({ row }) => <span className="tabular-nums">{row.original.cycleLengthDays}</span>,
    },
    {
      id: 'anchorDate',
      accessorKey: 'anchorDate',
      header: 'Çapa tarihi',
      size: 130,
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.anchorDate?.slice(0, 10)}</span>
      ),
    },
    {
      id: 'shifts',
      header: 'Vardiyalar',
      size: 220,
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {row.original.shifts.slice(0, 5).map((s) => (
            <span
              key={s.id}
              className="rounded px-1.5 py-0.5 text-2xs font-medium text-white"
              style={{ background: s.color || '#64748b' }}
            >
              {s.code || s.name}
            </span>
          ))}
        </div>
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
                    if (confirm(`"${row.original.name}" rotasyonu silinsin mi?`))
                      deleteMutation.mutate(row.original.id)
                  }}
                  aria-label="Sil"
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            ),
          } as ColumnDef<ShiftRotationDto>,
        ]
      : []),
  ]

  return (
    <PermissionRequired permission={HrPermissions.shiftsRead}>
      <PageWrapper>
        <DataGrid
          gridId="hr.shift-rotations"
          data={rotations}
          columns={columns}
          getRowId={(r) => r.id}
          loading={rotationsQuery.isLoading}
          onRowClick={
            canWrite
              ? (r) => {
                  setEditing(r)
                  setOpen(true)
                }
              : undefined
          }
          emptyText="Rotasyon yok."
          toolbar={
            canWrite ? (
              <Button
                onClick={() => {
                  setEditing(null)
                  setOpen(true)
                }}
              >
                <Plus />
                Yeni Rotasyon
              </Button>
            ) : null
          }
        />

        <RotationDialog
          open={open}
          onOpenChange={setOpen}
          editing={editing}
          shifts={shiftsQuery.data ?? []}
          onSaved={invalidate}
        />
      </PageWrapper>
    </PermissionRequired>
  )
}
