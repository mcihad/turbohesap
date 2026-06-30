import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import {
  ATTENDANCE_DIRECTION_LABELS,
  ATTENDANCE_METHOD_LABELS,
  ATTENDANCE_STATUS_LABELS,
  HrPermissions,
  toApiError,
  type AttendanceDirection,
  type AttendanceMethod,
  type AttendanceRecordDto,
  type AttendanceStatus,
} from '@turbohesap/shared'

import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth/auth-context'
import { PermissionRequired } from '@/lib/auth/permission-gate'
import { PageWrapper } from '@/components/layout/page'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FilterBar, FilterField } from '@/components/ui/filter-bar'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DataGrid, type ColumnDef } from '@/components/data-grid'
import { AttendanceDialog } from '../components/attendance-dialog'

const ALL = '__all__'

function statusVariant(s: AttendanceStatus): 'success' | 'destructive' | 'warning' {
  if (s === 'valid') return 'success'
  if (s === 'rejected') return 'destructive'
  return 'warning'
}

function fmtDateTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })
}

export function AttendancePage() {
  const qc = useQueryClient()
  const { hasPermission } = useAuth()
  const canRead = hasPermission(HrPermissions.attendanceRead)
  const canManage = hasPermission(HrPermissions.attendanceManage)

  const [method, setMethod] = React.useState(ALL)
  const [status, setStatus] = React.useState(ALL)
  const [direction, setDirection] = React.useState(ALL)
  const [employeeId, setEmployeeId] = React.useState(ALL)
  const [from, setFrom] = React.useState('')
  const [to, setTo] = React.useState('')

  const employeesQuery = useQuery({
    queryKey: ['hr', 'employees'],
    queryFn: () => api.hr.employees.list(),
    enabled: canRead,
  })
  const areasQuery = useQuery({
    queryKey: ['hr', 'checkin-areas'],
    queryFn: () => api.hr.checkinAreas.list(),
    enabled: canRead,
  })

  const query = React.useMemo(
    () => ({
      method: method === ALL ? undefined : (method as AttendanceMethod),
      status: status === ALL ? undefined : (status as AttendanceStatus),
      direction: direction === ALL ? undefined : (direction as AttendanceDirection),
      employeeId: employeeId === ALL ? undefined : employeeId,
      from: from || undefined,
      to: to || undefined,
    }),
    [method, status, direction, employeeId, from, to],
  )

  const recordsQuery = useQuery({
    queryKey: ['hr', 'attendance', query],
    queryFn: () => api.hr.attendance.list(query),
    enabled: canRead,
  })

  const [open, setOpen] = React.useState(false)

  const invalidate = () => qc.invalidateQueries({ queryKey: ['hr', 'attendance'] })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.hr.attendance.remove(id),
    onSuccess: () => {
      toast.success('Kayıt silindi')
      void invalidate()
    },
    onError: (e) => toast.error('Silme başarısız', { description: toApiError(e).message }),
  })

  const records = recordsQuery.data ?? []

  const activeCount =
    (method !== ALL ? 1 : 0) +
    (status !== ALL ? 1 : 0) +
    (direction !== ALL ? 1 : 0) +
    (employeeId !== ALL ? 1 : 0) +
    (from ? 1 : 0) +
    (to ? 1 : 0)

  const clearFilters = () => {
    setMethod(ALL)
    setStatus(ALL)
    setDirection(ALL)
    setEmployeeId(ALL)
    setFrom('')
    setTo('')
  }

  const columns: ColumnDef<AttendanceRecordDto>[] = [
    {
      id: 'eventTime',
      accessorKey: 'eventTime',
      header: 'Tarih/Saat',
      size: 150,
      cell: ({ row }) => <span className="text-sm">{fmtDateTime(row.original.eventTime)}</span>,
    },
    {
      id: 'employeeName',
      accessorKey: 'employeeName',
      header: 'Personel',
      size: 180,
      cell: ({ row }) => (
        <span className="font-medium">{row.original.employeeName ?? '—'}</span>
      ),
    },
    {
      id: 'direction',
      accessorKey: 'direction',
      header: 'Yön',
      size: 100,
      enableGrouping: true,
      cell: ({ row }) => (
        <Badge variant={row.original.direction === 'in' ? 'success' : row.original.direction === 'out' ? 'info' : 'outline'}>
          {ATTENDANCE_DIRECTION_LABELS[row.original.direction]}
        </Badge>
      ),
    },
    {
      id: 'method',
      accessorKey: 'method',
      header: 'Yöntem',
      size: 120,
      enableGrouping: true,
      cell: ({ row }) => (
        <span className="text-muted-foreground">{ATTENDANCE_METHOD_LABELS[row.original.method]}</span>
      ),
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: 'Durum',
      size: 110,
      enableGrouping: true,
      cell: ({ row }) => (
        <Badge variant={statusVariant(row.original.status)}>
          {ATTENDANCE_STATUS_LABELS[row.original.status]}
        </Badge>
      ),
    },
    {
      id: 'area',
      header: 'Alan',
      size: 150,
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.area?.name ?? '—'}</span>
      ),
    },
    {
      id: 'distanceMeters',
      accessorKey: 'distanceMeters',
      header: 'Mesafe (m)',
      size: 110,
      cell: ({ row }) => (
        <span className="tabular-nums text-muted-foreground">
          {row.original.distanceMeters == null ? '—' : Math.round(row.original.distanceMeters)}
        </span>
      ),
    },
    {
      id: 'flagReason',
      accessorKey: 'flagReason',
      header: 'İşaret nedeni',
      size: 180,
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">{row.original.flagReason ?? '—'}</span>
      ),
    },
    ...(canManage
      ? [
          {
            id: 'actions',
            header: '',
            size: 60,
            enableSorting: false,
            enableHiding: false,
            enableColumnFilter: false,
            enableGrouping: false,
            cell: ({ row }) => (
              <div className="flex justify-end">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (confirm('Kayıt silinsin mi?')) deleteMutation.mutate(row.original.id)
                  }}
                  aria-label="Sil"
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            ),
          } as ColumnDef<AttendanceRecordDto>,
        ]
      : []),
  ]

  const employees = employeesQuery.data ?? []

  return (
    <PermissionRequired permission={HrPermissions.attendanceRead}>
      <PageWrapper>
        <FilterBar activeCount={activeCount} onClear={clearFilters}>
          <FilterField label="Personel">
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Tümü</SelectItem>
                {employees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>
          <FilterField label="Yön">
            <Select value={direction} onValueChange={setDirection}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Tümü</SelectItem>
                {(['in', 'out', 'unknown'] as AttendanceDirection[]).map((d) => (
                  <SelectItem key={d} value={d}>
                    {ATTENDANCE_DIRECTION_LABELS[d]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>
          <FilterField label="Yöntem">
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Tümü</SelectItem>
                {(['mobile_gps', 'card', 'web', 'manual'] as AttendanceMethod[]).map((m) => (
                  <SelectItem key={m} value={m}>
                    {ATTENDANCE_METHOD_LABELS[m]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>
          <FilterField label="Durum">
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Tümü</SelectItem>
                {(['valid', 'flagged', 'rejected'] as AttendanceStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>
                    {ATTENDANCE_STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>
          <FilterField label="Başlangıç">
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </FilterField>
          <FilterField label="Bitiş">
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </FilterField>
        </FilterBar>

        <DataGrid
          gridId="hr.attendance"
          data={records}
          columns={columns}
          getRowId={(r) => r.id}
          loading={recordsQuery.isLoading}
          emptyText="Kayıt yok."
          toolbar={
            canManage ? (
              <Button onClick={() => setOpen(true)}>
                <Plus />
                Elle Kayıt
              </Button>
            ) : null
          }
        />

        {open ? (
          <AttendanceDialog
            open={open}
            onOpenChange={setOpen}
            employees={employees}
            areas={areasQuery.data ?? []}
            onSaved={invalidate}
          />
        ) : null}
      </PageWrapper>
    </PermissionRequired>
  )
}
