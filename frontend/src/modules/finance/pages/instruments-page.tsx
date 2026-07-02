import * as React from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'

import {
  FinancePermissions,
  INSTRUMENT_DIRECTIONS,
  INSTRUMENT_TYPES,
  type FinancialInstrumentDto,
  type InstrumentDirection,
  type InstrumentListQuery,
  type InstrumentStatus,
  type InstrumentType,
} from '@turbohesap/shared'

import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth/auth-context'
import { PermissionRequired } from '@/lib/auth/permission-gate'
import { formatDate } from '@/lib/datetime'
import { PageWrapper } from '@/components/layout/page'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FilterBar, FilterField } from '@/components/ui/filter-bar'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DataGrid, type ColumnDef } from '@/components/data-grid'
import { EntityCombobox } from '@/modules/invoices/components/entity-combobox'
import { InstrumentFormDialog } from '../components/instrument-form-dialog'
import {
  INSTRUMENT_STATUS_LABELS,
  INSTRUMENT_STATUS_TONE,
  instrumentDirectionLabel,
  instrumentStatusLabel,
  instrumentTypeLabel,
} from '../instrument-labels'
import { formatMoney } from './cash-accounts-page'

const ALL = '__all__'

export function InstrumentsPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { hasPermission } = useAuth()
  const canRead = hasPermission(FinancePermissions.instrumentsRead)
  const canWrite = hasPermission(FinancePermissions.instrumentsWrite)

  const [direction, setDirection] = React.useState(ALL)
  const [instrumentType, setInstrumentType] = React.useState(ALL)
  const [status, setStatus] = React.useState(ALL)
  const [contactId, setContactId] = React.useState<string | null>(null)
  const [from, setFrom] = React.useState('')
  const [to, setTo] = React.useState('')

  const [dialogOpen, setDialogOpen] = React.useState(false)

  const contactsQuery = useQuery({
    queryKey: ['contacts', 'contacts'],
    queryFn: () => api.contacts.contacts.list(),
  })
  const contacts = contactsQuery.data ?? []

  const query: InstrumentListQuery = React.useMemo(
    () => ({
      direction: direction === ALL ? undefined : (direction as InstrumentDirection),
      instrumentType: instrumentType === ALL ? undefined : (instrumentType as InstrumentType),
      status: status === ALL ? undefined : (status as InstrumentStatus),
      contactId: contactId ?? undefined,
      from: from || undefined,
      to: to || undefined,
    }),
    [direction, instrumentType, status, contactId, from, to],
  )

  const listQuery = useQuery({
    queryKey: ['finance', 'instruments', query],
    queryFn: () => api.finance.instruments.list(query),
    enabled: canRead,
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['finance', 'instruments'] })

  const activeCount =
    (direction !== ALL ? 1 : 0) +
    (instrumentType !== ALL ? 1 : 0) +
    (status !== ALL ? 1 : 0) +
    (contactId ? 1 : 0) +
    (from ? 1 : 0) +
    (to ? 1 : 0)

  const clearFilters = () => {
    setDirection(ALL)
    setInstrumentType(ALL)
    setStatus(ALL)
    setContactId(null)
    setFrom('')
    setTo('')
  }

  const columns: ColumnDef<FinancialInstrumentDto>[] = [
    {
      id: 'instrumentType',
      accessorKey: 'instrumentType',
      header: 'Tür',
      size: 90,
      enableGrouping: true,
      cell: ({ row }) => <Badge variant="secondary">{instrumentTypeLabel(row.original.instrumentType)}</Badge>,
    },
    {
      id: 'direction',
      accessorKey: 'direction',
      header: 'Yön',
      size: 100,
      enableGrouping: true,
      cell: ({ row }) => (
        <Badge variant={row.original.direction === 'received' ? 'info' : 'outline'}>
          {instrumentDirectionLabel(row.original.direction)}
        </Badge>
      ),
    },
    {
      id: 'contactName',
      accessorKey: 'contactName',
      header: 'Cari',
      size: 220,
      cell: ({ row }) => <span className="font-medium">{row.original.contactName ?? '—'}</span>,
    },
    {
      id: 'instrumentNo',
      accessorKey: 'instrumentNo',
      header: 'No',
      size: 120,
      cell: ({ row }) => <span className="font-mono text-xs">{row.original.instrumentNo || '—'}</span>,
    },
    {
      id: 'amount',
      accessorKey: 'amount',
      header: () => <div className="text-right">Tutar</div>,
      size: 150,
      cell: ({ row }) => (
        <div className="text-right font-mono font-semibold tabular-nums">
          {formatMoney(row.original.amount, row.original.currencyCode)}
        </div>
      ),
    },
    {
      id: 'dueDate',
      accessorKey: 'dueDate',
      header: 'Vade',
      size: 120,
      cell: ({ row }) => <span className="text-sm">{formatDate(row.original.dueDate)}</span>,
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: 'Durum',
      size: 150,
      enableGrouping: true,
      cell: ({ row }) => (
        <Badge variant={INSTRUMENT_STATUS_TONE[row.original.status]}>
          {instrumentStatusLabel(row.original.status)}
        </Badge>
      ),
    },
    {
      id: 'bankName',
      accessorKey: 'bankName',
      header: 'Banka',
      size: 150,
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">{row.original.bankName || '—'}</span>
      ),
    },
  ]

  return (
    <PermissionRequired permission={FinancePermissions.instrumentsRead}>
      <PageWrapper>
        <FilterBar activeCount={activeCount} onClear={clearFilters}>
          <FilterField label="Yön">
            <Select value={direction} onValueChange={setDirection}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Tümü</SelectItem>
                {INSTRUMENT_DIRECTIONS.map((d) => (
                  <SelectItem key={d} value={d}>
                    {instrumentDirectionLabel(d)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>
          <FilterField label="Tür">
            <Select value={instrumentType} onValueChange={setInstrumentType}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Tümü</SelectItem>
                {INSTRUMENT_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {instrumentTypeLabel(t)}
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
                {(Object.keys(INSTRUMENT_STATUS_LABELS) as InstrumentStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>
                    {instrumentStatusLabel(s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>
          <FilterField label="Cari">
            <EntityCombobox
              items={contacts}
              value={contactId}
              onChange={(id) => setContactId(id)}
              getId={(c) => c.id}
              getLabel={(c) => c.name}
              getSub={(c) => c.code}
              placeholder="Tüm cariler"
              searchPlaceholder="Cari ara…"
              emptyText="Cari bulunamadı"
            />
          </FilterField>
          <FilterField label="Vade Başlangıç">
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </FilterField>
          <FilterField label="Vade Bitiş">
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </FilterField>
        </FilterBar>

        <DataGrid
          gridId="finance.instruments"
          data={listQuery.data ?? []}
          columns={columns}
          getRowId={(row) => row.id}
          loading={listQuery.isLoading}
          onRowClick={(row) => navigate({ to: '/finance/instruments/$id', params: { id: row.id } })}
          emptyText="Çek/Senet kaydı yok."
          toolbar={
            canWrite ? (
              <Button onClick={() => setDialogOpen(true)}>
                <Plus /> Yeni Çek/Senet
              </Button>
            ) : null
          }
        />

        <InstrumentFormDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          editing={null}
          onSuccess={invalidate}
        />
      </PageWrapper>
    </PermissionRequired>
  )
}
