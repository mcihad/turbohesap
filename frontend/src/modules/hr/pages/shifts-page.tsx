import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Moon, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { HrPermissions, toApiError, type ShiftDto } from '@turbohesap/shared'

import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth/auth-context'
import { PermissionRequired } from '@/lib/auth/permission-gate'
import { PageWrapper } from '@/components/layout/page'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataGrid, type ColumnDef } from '@/components/data-grid'
import { ShiftDialog } from '../components/shift-dialog'

export function ShiftsPage() {
  const qc = useQueryClient()
  const { hasPermission } = useAuth()
  const canRead = hasPermission(HrPermissions.shiftsRead)
  const canWrite = hasPermission(HrPermissions.shiftsWrite)

  const shiftsQuery = useQuery({
    queryKey: ['hr', 'shifts'],
    queryFn: () => api.hr.shifts.list(),
    enabled: canRead,
  })
  const branchesQuery = useQuery({
    queryKey: ['org', 'branches'],
    queryFn: () => api.org.branches.list(),
    enabled: canRead,
  })

  const [open, setOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<ShiftDto | null>(null)

  const invalidate = () => qc.invalidateQueries({ queryKey: ['hr', 'shifts'] })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.hr.shifts.remove(id),
    onSuccess: () => {
      toast.success('Vardiya silindi')
      void invalidate()
    },
    onError: (e) => toast.error('Silme başarısız', { description: toApiError(e).message }),
  })

  const shifts = shiftsQuery.data ?? []

  const columns: ColumnDef<ShiftDto>[] = [
    {
      id: 'code',
      accessorKey: 'code',
      header: 'Kod',
      size: 100,
      cell: ({ row }) => <span className="font-mono text-xs">{row.original.code || '—'}</span>,
    },
    {
      id: 'name',
      accessorKey: 'name',
      header: 'Ad',
      size: 200,
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <span
            className="size-3 shrink-0 rounded-full border border-border"
            style={{ background: row.original.color }}
          />
          <span className="font-medium">{row.original.name}</span>
        </div>
      ),
    },
    {
      id: 'time',
      header: 'Saat',
      size: 160,
      cell: ({ row }) =>
        row.original.isDayOff ? (
          <Badge variant="outline">İzin (OFF)</Badge>
        ) : (
          <span className="flex items-center gap-1.5 text-sm">
            {row.original.startTime} – {row.original.endTime}
            {row.original.crossesMidnight ? (
              <Moon className="size-3.5 text-muted-foreground" aria-label="Gece vardiyası" />
            ) : null}
          </span>
        ),
    },
    {
      id: 'breaks',
      header: 'Mola',
      size: 90,
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.breaks?.length ?? 0}</span>
      ),
    },
    {
      id: 'lateGraceMin',
      accessorKey: 'lateGraceMin',
      header: 'Tolerans (dk)',
      size: 120,
      cell: ({ row }) => <span className="text-muted-foreground">{row.original.lateGraceMin}</span>,
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
                    if (confirm(`"${row.original.name}" vardiyası silinsin mi?`))
                      deleteMutation.mutate(row.original.id)
                  }}
                  aria-label="Sil"
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            ),
          } as ColumnDef<ShiftDto>,
        ]
      : []),
  ]

  return (
    <PermissionRequired permission={HrPermissions.shiftsRead}>
      <PageWrapper>
        <DataGrid
          gridId="hr.shifts"
          data={shifts}
          columns={columns}
          getRowId={(s) => s.id}
          loading={shiftsQuery.isLoading}
          onRowClick={
            canWrite
              ? (s) => {
                  setEditing(s)
                  setOpen(true)
                }
              : undefined
          }
          emptyText="Vardiya yok."
          toolbar={
            canWrite ? (
              <Button
                onClick={() => {
                  setEditing(null)
                  setOpen(true)
                }}
              >
                <Plus />
                Yeni Vardiya
              </Button>
            ) : null
          }
        />

        <ShiftDialog
          open={open}
          onOpenChange={setOpen}
          editing={editing}
          branches={branchesQuery.data ?? []}
          onSaved={invalidate}
        />
      </PageWrapper>
    </PermissionRequired>
  )
}
