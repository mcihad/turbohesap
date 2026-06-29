import * as React from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'

import {
  FEEDBACK_STATUS_LABELS,
  FEEDBACK_STATUSES,
  FEEDBACK_TYPE_LABELS,
  FEEDBACK_TYPES,
  FEEDBACK_PRIORITY_LABELS,
  FeedbackPermissions,
  type FeedbackDto,
  type FeedbackStatus,
  type FeedbackType,
} from '@turbohesap/shared'

import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth/auth-context'
import { PermissionRequired } from '@/lib/auth/permission-gate'
import { formatDateTime } from '@/lib/datetime'
import { PageWrapper } from '@/components/layout/page'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DataGrid, type ColumnDef } from '@/components/data-grid'
import { PRIORITY_TONE, STATUS_TONE } from '../labels'

const ALL = '__all__'

export function FeedbackListPage() {
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const [typeFilter, setTypeFilter] = React.useState<FeedbackType | typeof ALL>(ALL)
  const [statusFilter, setStatusFilter] = React.useState<FeedbackStatus | typeof ALL>(ALL)

  const query = useQuery({
    queryKey: ['feedback', 'list'],
    queryFn: () => api.feedback.list(),
    enabled: hasPermission(FeedbackPermissions.read),
  })

  const rows = React.useMemo(() => {
    let data = query.data ?? []
    if (typeFilter !== ALL) data = data.filter((f) => f.type === typeFilter)
    if (statusFilter !== ALL) data = data.filter((f) => f.status === statusFilter)
    return data
  }, [query.data, typeFilter, statusFilter])

  const columns = React.useMemo<ColumnDef<FeedbackDto, unknown>[]>(
    () => [
      {
        id: 'type',
        accessorKey: 'type',
        header: 'Tip',
        size: 130,
        cell: ({ row }) => (
          <Badge variant="outline">{FEEDBACK_TYPE_LABELS[row.original.type]}</Badge>
        ),
      },
      {
        id: 'title',
        accessorKey: 'title',
        header: 'Başlık',
        cell: ({ row }) => (
          <span className="font-medium">
            {row.original.title?.trim() || row.original.message.slice(0, 60) || '—'}
          </span>
        ),
      },
      {
        id: 'status',
        accessorKey: 'status',
        header: 'Durum',
        size: 120,
        cell: ({ row }) => (
          <Badge variant={STATUS_TONE[row.original.status]}>
            {FEEDBACK_STATUS_LABELS[row.original.status]}
          </Badge>
        ),
      },
      {
        id: 'priority',
        accessorKey: 'priority',
        header: 'Öncelik',
        size: 110,
        cell: ({ row }) => (
          <Badge variant={PRIORITY_TONE[row.original.priority]}>
            {FEEDBACK_PRIORITY_LABELS[row.original.priority]}
          </Badge>
        ),
      },
      {
        id: 'createdByName',
        accessorKey: 'createdByName',
        header: 'Gönderen',
        size: 160,
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">{row.original.createdByName}</span>
        ),
      },
      {
        id: 'createdAt',
        accessorKey: 'createdAt',
        header: 'Tarih',
        size: 160,
        cell: ({ row }) => (
          <span className="text-sm tabular-nums">{formatDateTime(row.original.createdAt)}</span>
        ),
      },
    ],
    [],
  )

  return (
    <PermissionRequired permission={FeedbackPermissions.read}>
      <PageWrapper>
        <DataGrid
          gridId="feedback.list"
          data={rows}
          columns={columns}
          getRowId={(row) => row.id}
          loading={query.isLoading}
          emptyText="Geri bildirim yok."
          onRowClick={(row) => void navigate({ to: '/feedback/$id', params: { id: row.id } })}
          toolbar={
            <div className="flex items-center gap-2">
              <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as never)}>
                <SelectTrigger size="sm" className="w-[150px]">
                  <SelectValue placeholder="Tip" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Tüm tipler</SelectItem>
                  {FEEDBACK_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {FEEDBACK_TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as never)}>
                <SelectTrigger size="sm" className="w-[150px]">
                  <SelectValue placeholder="Durum" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Tüm durumlar</SelectItem>
                  {FEEDBACK_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {FEEDBACK_STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          }
        />
      </PageWrapper>
    </PermissionRequired>
  )
}
