import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, ListChecks, Plus, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'

import {
  HrPermissions,
  LEAVE_STATUS_LABELS,
  toApiError,
  type LeaveRequestDto,
  type LeaveStatus,
} from '@turbohesap/shared'

import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth/auth-context'
import { PermissionRequired } from '@/lib/auth/permission-gate'
import { formatDate } from '@/lib/datetime'
import { PageWrapper } from '@/components/layout/page'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataGrid, type ColumnDef } from '@/components/data-grid'
import { LeaveRequestDialog } from '../components/leave-request-dialog'
import { LeaveTypesDialog } from '../components/leave-types-dialog'

const STATUS_TONE: Record<LeaveStatus, 'outline' | 'success' | 'destructive'> = {
  pending: 'outline',
  approved: 'success',
  rejected: 'destructive',
}

export function LeavesPage() {
  const qc = useQueryClient()
  const { hasPermission } = useAuth()
  const canRead = hasPermission(HrPermissions.read)
  const canWrite = hasPermission(HrPermissions.write)
  const canApprove = hasPermission(HrPermissions.approve)

  const [leaveDialog, setLeaveDialog] = React.useState(false)
  const [typesDialog, setTypesDialog] = React.useState(false)

  const query = useQuery({
    queryKey: ['hr', 'leave-requests'],
    queryFn: () => api.hr.leaveRequests.list(),
    enabled: canRead,
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['hr'] })

  const approveMutation = useMutation({
    mutationFn: (id: string) => api.hr.leaveRequests.approve(id),
    onSuccess: () => {
      toast.success('İzin onaylandı')
      void invalidate()
    },
    onError: (e) => toast.error('Onaylanamadı', { description: toApiError(e).message }),
  })
  const rejectMutation = useMutation({
    mutationFn: (id: string) => api.hr.leaveRequests.reject(id),
    onSuccess: () => {
      toast.success('İzin reddedildi')
      void invalidate()
    },
    onError: (e) => toast.error('Reddedilemedi', { description: toApiError(e).message }),
  })
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.hr.leaveRequests.remove(id),
    onSuccess: () => {
      toast.success('İzin talebi silindi')
      void invalidate()
    },
    onError: (e) => toast.error('Silinemedi', { description: toApiError(e).message }),
  })

  const columns: ColumnDef<LeaveRequestDto>[] = [
    {
      id: 'employee',
      accessorKey: 'employeeName',
      header: 'Personel',
      size: 200,
      cell: ({ row }) => <span className="font-medium">{row.original.employeeName}</span>,
    },
    {
      id: 'type',
      accessorKey: 'leaveTypeName',
      header: 'İzin Türü',
      size: 160,
      enableGrouping: true,
      cell: ({ row }) => <span className="text-sm">{row.original.leaveTypeName}</span>,
    },
    {
      id: 'range',
      header: 'Tarih Aralığı',
      size: 200,
      cell: ({ row }) => (
        <span className="text-sm">
          {formatDate(row.original.startDate)} – {formatDate(row.original.endDate)}
        </span>
      ),
    },
    {
      id: 'days',
      accessorKey: 'days',
      header: 'Gün',
      size: 70,
      cell: ({ row }) => <span className="text-right tabular-nums">{row.original.days}</span>,
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: 'Durum',
      size: 130,
      enableGrouping: true,
      cell: ({ row }) => (
        <Badge variant={STATUS_TONE[row.original.status]}>
          {LEAVE_STATUS_LABELS[row.original.status]}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: '',
      size: 150,
      enableSorting: false,
      enableHiding: false,
      enableColumnFilter: false,
      enableGrouping: false,
      cell: ({ row }) => {
        const req = row.original
        const pending = req.status === 'pending'
        return (
          <div className="flex justify-end gap-1">
            {canApprove && pending ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={approveMutation.isPending}
                  onClick={() => approveMutation.mutate(req.id)}
                >
                  <Check className="size-4 text-emerald-600" />
                  Onayla
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={rejectMutation.isPending}
                  onClick={() => rejectMutation.mutate(req.id)}
                >
                  <X className="size-4 text-destructive" />
                  Reddet
                </Button>
              </>
            ) : null}
            {canWrite && pending ? (
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Sil"
                onClick={() => {
                  if (confirm('İzin talebi silinsin mi?')) deleteMutation.mutate(req.id)
                }}
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            ) : null}
          </div>
        )
      },
    },
  ]

  return (
    <PermissionRequired permission={HrPermissions.read}>
      <PageWrapper>
        <DataGrid
          gridId="hr.leaves.list"
          data={query.data ?? []}
          columns={columns}
          getRowId={(row) => row.id}
          loading={query.isLoading}
          emptyText="İzin talebi yok."
          toolbar={
            <>
              {canWrite ? (
                <Button variant="outline" onClick={() => setTypesDialog(true)}>
                  <ListChecks /> İzin Türleri
                </Button>
              ) : null}
              {canWrite ? (
                <Button onClick={() => setLeaveDialog(true)}>
                  <Plus /> Yeni İzin
                </Button>
              ) : null}
            </>
          }
        />
        <LeaveRequestDialog open={leaveDialog} onOpenChange={setLeaveDialog} />
        <LeaveTypesDialog open={typesDialog} onOpenChange={setTypesDialog} />
      </PageWrapper>
    </PermissionRequired>
  )
}
