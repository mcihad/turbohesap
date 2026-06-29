import * as React from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'

import {
  HrPermissions,
  PAYROLL_RUN_STATUS_LABELS,
  toApiError,
  type PayrollRunDto,
  type PayrollRunStatus,
} from '@turbohesap/shared'

import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth/auth-context'
import { PermissionRequired } from '@/lib/auth/permission-gate'
import { PageWrapper } from '@/components/layout/page'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DataGrid, type ColumnDef } from '@/components/data-grid'
import { formatMoney, MONTH_LABELS, periodLabel } from '../format'

const STATUS_TONE: Record<PayrollRunStatus, 'outline' | 'info' | 'success'> = {
  draft: 'outline',
  finalized: 'info',
  paid: 'success',
}

const now = new Date()
const YEARS = Array.from({ length: 6 }, (_, i) => now.getFullYear() - i)

export function PayrollListPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { hasPermission } = useAuth()
  const canRead = hasPermission(HrPermissions.read)
  const canPayroll = hasPermission(HrPermissions.payroll)

  const [dialog, setDialog] = React.useState(false)
  const [year, setYear] = React.useState(now.getFullYear())
  const [month, setMonth] = React.useState(now.getMonth() + 1)

  const query = useQuery({
    queryKey: ['hr', 'payroll', 'runs'],
    queryFn: () => api.hr.payroll.listRuns(),
    enabled: canRead,
  })

  const createRun = useMutation({
    mutationFn: () => api.hr.payroll.createRun({ year, month }),
    onSuccess: (run) => {
      toast.success('Bordro dönemi oluşturuldu')
      void qc.invalidateQueries({ queryKey: ['hr', 'payroll'] })
      setDialog(false)
      navigate({ to: '/hr/payroll/$id', params: { id: run.id } })
    },
    onError: (e) => toast.error('Oluşturulamadı', { description: toApiError(e).message }),
  })

  const columns: ColumnDef<PayrollRunDto>[] = [
    {
      id: 'period',
      header: 'Dönem',
      size: 180,
      accessorFn: (r) => `${r.year}-${String(r.month).padStart(2, '0')}`,
      cell: ({ row }) => <span className="font-medium">{periodLabel(row.original.year, row.original.month)}</span>,
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: 'Durum',
      size: 120,
      enableGrouping: true,
      cell: ({ row }) => (
        <Badge variant={STATUS_TONE[row.original.status]}>
          {PAYROLL_RUN_STATUS_LABELS[row.original.status]}
        </Badge>
      ),
    },
    {
      id: 'payslipCount',
      accessorKey: 'payslipCount',
      header: 'Pusula',
      size: 90,
      cell: ({ row }) => <span className="text-right tabular-nums">{row.original.payslipCount}</span>,
    },
    {
      id: 'totalNet',
      accessorKey: 'totalNet',
      header: 'Net Toplam',
      size: 160,
      cell: ({ row }) => (
        <div className="text-right font-mono font-semibold tabular-nums">{formatMoney(row.original.totalNet)}</div>
      ),
    },
    {
      id: 'totalCost',
      accessorKey: 'totalCost',
      header: 'İşveren Maliyeti',
      size: 170,
      cell: ({ row }) => (
        <div className="text-right font-mono tabular-nums">{formatMoney(row.original.totalCost)}</div>
      ),
    },
  ]

  return (
    <PermissionRequired permission={HrPermissions.read}>
      <PageWrapper>
        <DataGrid
          gridId="hr.payroll.runs"
          data={query.data ?? []}
          columns={columns}
          getRowId={(row) => row.id}
          loading={query.isLoading}
          onRowClick={(row) => navigate({ to: '/hr/payroll/$id', params: { id: row.id } })}
          emptyText="Bordro dönemi yok."
          toolbar={
            canPayroll ? (
              <Button onClick={() => setDialog(true)}>
                <Plus /> Yeni Dönem
              </Button>
            ) : null
          }
        />

        <Dialog open={dialog} onOpenChange={setDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Yeni Bordro Dönemi</DialogTitle>
              <DialogDescription>Bir yıl/ay seçerek yeni bir bordro dönemi açın.</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1.5 block text-xs text-muted-foreground">Yıl</Label>
                <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {YEARS.map((y) => (
                      <SelectItem key={y} value={String(y)}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1.5 block text-xs text-muted-foreground">Ay</Label>
                <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTH_LABELS.map((label, i) => (
                      <SelectItem key={i} value={String(i + 1)}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialog(false)}>
                Vazgeç
              </Button>
              <Button disabled={createRun.isPending} onClick={() => createRun.mutate()}>
                Oluştur
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageWrapper>
    </PermissionRequired>
  )
}
