import * as React from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Eye, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import {
  EMPLOYMENT_TYPE_LABELS,
  HrPermissions,
  SALARY_TYPE_LABELS,
  toApiError,
  type EmployeeDto,
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
import { EmployeeDialog } from '../components/employee-dialog'
import { formatMoney } from '../format'

export function EmployeesListPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { hasPermission } = useAuth()
  const canRead = hasPermission(HrPermissions.read)
  const canWrite = hasPermission(HrPermissions.write)
  const [dialog, setDialog] = React.useState<{ open: boolean; employee: EmployeeDto | null }>({
    open: false,
    employee: null,
  })

  const query = useQuery({
    queryKey: ['hr', 'employees', 'list'],
    queryFn: () => api.hr.employees.list(),
    enabled: canRead,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.hr.employees.remove(id),
    onSuccess: () => {
      toast.success('Personel silindi')
      void qc.invalidateQueries({ queryKey: ['hr'] })
    },
    onError: (e) => toast.error('Silme başarısız', { description: toApiError(e).message }),
  })

  const columns: ColumnDef<EmployeeDto>[] = [
    {
      id: 'name',
      accessorKey: 'fullName',
      header: 'Ad Soyad',
      size: 220,
      cell: ({ row }) => <span className="font-medium">{row.original.fullName}</span>,
    },
    {
      id: 'department',
      accessorKey: 'departmentKey',
      header: 'Departman',
      size: 160,
      enableGrouping: true,
      cell: ({ row }) => <span className="text-sm">{row.original.departmentKey || '—'}</span>,
    },
    {
      id: 'position',
      accessorKey: 'positionKey',
      header: 'Pozisyon',
      size: 160,
      cell: ({ row }) => <span className="text-sm">{row.original.positionKey || '—'}</span>,
    },
    {
      id: 'employmentType',
      accessorKey: 'employmentType',
      header: 'Çalışma Türü',
      size: 130,
      enableGrouping: true,
      cell: ({ row }) => (
        <Badge variant="secondary">{EMPLOYMENT_TYPE_LABELS[row.original.employmentType]}</Badge>
      ),
    },
    {
      id: 'salary',
      accessorKey: 'salaryAmount',
      header: 'Maaş',
      size: 170,
      cell: ({ row }) => (
        <div className="text-right">
          <span className="font-mono font-semibold tabular-nums">{formatMoney(row.original.salaryAmount)}</span>
          <span className="ml-1.5 text-2xs text-muted-foreground">{SALARY_TYPE_LABELS[row.original.salaryType]}</span>
        </div>
      ),
    },
    {
      id: 'status',
      header: 'Durum',
      size: 100,
      enableGrouping: true,
      accessorFn: (e) => (e.isActive ? 'aktif' : 'pasif'),
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
        const emp = row.original
        return (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="İşlemler"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation()
                    navigate({ to: '/hr/employees/$id', params: { id: emp.id } })
                  }}
                >
                  <Eye className="size-4" />
                  Görüntüle
                </DropdownMenuItem>
                {canWrite ? (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation()
                        setDialog({ open: true, employee: emp })
                      }}
                    >
                      <Pencil className="size-4" />
                      Düzenle
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={(e) => {
                        e.stopPropagation()
                        if (confirm(`"${emp.fullName}" personeli silinsin mi?`)) {
                          deleteMutation.mutate(emp.id)
                        }
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
    <PermissionRequired permission={HrPermissions.read}>
      <PageWrapper>
        <DataGrid
          gridId="hr.employees.list"
          data={query.data ?? []}
          columns={columns}
          getRowId={(row) => row.id}
          loading={query.isLoading}
          onRowClick={(row) => navigate({ to: '/hr/employees/$id', params: { id: row.id } })}
          emptyText="Personel yok."
          toolbar={
            canWrite ? (
              <Button onClick={() => setDialog({ open: true, employee: null })}>
                <Plus /> Yeni Personel
              </Button>
            ) : null
          }
        />
        {canWrite ? (
          <EmployeeDialog
            open={dialog.open}
            onOpenChange={(open) => setDialog((d) => ({ ...d, open }))}
            employee={dialog.employee}
          />
        ) : null}
      </PageWrapper>
    </PermissionRequired>
  )
}
