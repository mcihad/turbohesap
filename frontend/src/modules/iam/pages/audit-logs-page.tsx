import * as React from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'

import { type AuditAction, type AuditLogQuery, IamPermissions } from '@turbohesap/shared'

import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth/auth-context'
import { PermissionRequired } from '@/lib/auth/permission-gate'
import {
  PageFooter,
  PageFooterStat,
  PageHeader,
  PageWrapper,
} from '@/components/layout/page'
import { AuditTrail } from '@/components/ui/audit-trail'
import { Button } from '@/components/ui/button'
import {
  DateRangePicker,
  type DateRange,
} from '@/components/ui/date-range-picker'
import { FilterBar, FilterField } from '@/components/ui/filter-bar'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const PAGE_SIZE = 20
const ACTION_ALL = 'all'

interface Filters {
  search: string
  entityType: string
  module: string
  action: AuditAction | typeof ACTION_ALL
  range: DateRange | undefined
}

const EMPTY: Filters = {
  search: '',
  entityType: '',
  module: '',
  action: ACTION_ALL,
  range: undefined,
}

function buildQuery(f: Filters, page: number): AuditLogQuery {
  return {
    page,
    pageSize: PAGE_SIZE,
    ...(f.search ? { search: f.search } : {}),
    ...(f.entityType ? { entityType: f.entityType } : {}),
    ...(f.module ? { module: f.module } : {}),
    ...(f.action !== ACTION_ALL ? { action: f.action } : {}),
    ...(f.range?.from
      ? { from: `${format(f.range.from, 'yyyy-MM-dd')}T00:00:00` }
      : {}),
    ...(f.range?.to
      ? { to: `${format(f.range.to, 'yyyy-MM-dd')}T23:59:59` }
      : {}),
  }
}

export function AuditLogsPage() {
  const { hasPermission } = useAuth()
  const canRead = hasPermission(IamPermissions.auditRead)

  const [filters, setFilters] = React.useState<Filters>(EMPTY)
  const [page, setPage] = React.useState(1)

  // Reset to page 1 whenever a filter changes.
  const setFilter = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    setFilters((f) => ({ ...f, [key]: value }))
    setPage(1)
  }

  const query = buildQuery(filters, page)
  const logsQuery = useQuery({
    queryKey: ['iam', 'audit-logs', query],
    queryFn: () => api.iam.auditLogs.list(query),
    enabled: canRead,
    placeholderData: keepPreviousData,
  })

  const data = logsQuery.data
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const activeCount = [
    filters.search,
    filters.entityType,
    filters.action !== ACTION_ALL,
    filters.range?.from,
  ].filter(Boolean).length

  const clearFilters = () => {
    setFilters(EMPTY)
    setPage(1)
  }

  return (
    <PermissionRequired permission={IamPermissions.auditRead}>
      <PageWrapper>
        <PageHeader
          title="Denetim Kayıtları"
          description="Varlıklar üzerinde yapılan tüm değişikliklerin kaydı."
          search={{
            value: filters.search,
            onChange: (v) => setFilter('search', v),
            fields: ['Varlık türü', 'Kayıt no', 'Kullanıcı', 'Değişiklik'],
          }}
        />

        {/* Filters */}
        <FilterBar activeCount={activeCount} onClear={clearFilters}>
          <FilterField label="Varlık türü" htmlFor="a-entity">
            <Input
              id="a-entity"
              placeholder="User, Role…"
              value={filters.entityType}
              onChange={(e) => setFilter('entityType', e.target.value)}
            />
          </FilterField>
          <FilterField label="İşlem">
            <Select
              value={filters.action}
              onValueChange={(v) => setFilter('action', v as Filters['action'])}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ACTION_ALL}>Tümü</SelectItem>
                <SelectItem value="Insert">Ekleme</SelectItem>
                <SelectItem value="Update">Güncelleme</SelectItem>
                <SelectItem value="Delete">Silme</SelectItem>
              </SelectContent>
            </Select>
          </FilterField>
          <FilterField label="Tarih aralığı" className="sm:col-span-2">
            <DateRangePicker
              value={filters.range}
              onChange={(r) => setFilter('range', r)}
              max={new Date()}
            />
          </FilterField>
        </FilterBar>

        {/* Timeline — diffs are lazy-loaded per row on expand. */}
        <div className="rounded-xl border bg-card p-4 sm:p-5">
          <AuditTrail
            logs={data?.items ?? []}
            loading={logsQuery.isLoading}
            emptyText="Bu filtrelerle kayıt bulunamadı."
            loadDetail={(id) => api.iam.auditLogs.get(id)}
          />
        </div>

        {/* Pagination */}
        {total > 0 ? (
          <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {total} kayıt · sayfa {page}/{totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Önceki
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Sonraki
              </Button>
            </div>
          </div>
        ) : null}

        <PageFooter>
          <PageFooterStat label="Kayıt" value={total.toLocaleString('tr-TR')} />
          <PageFooterStat label="Sayfa" value={`${page}/${totalPages}`} />
          <PageFooterStat label="Filtre" value={activeCount} />
          {logsQuery.isFetching ? (
            <PageFooterStat label="Durum" value="yükleniyor…" />
          ) : null}
        </PageFooter>
      </PageWrapper>
    </PermissionRequired>
  )
}
