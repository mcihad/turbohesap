import * as React from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Building2, Download, Pencil, Plus, Trash2, Upload, User } from 'lucide-react'
import { toast } from 'sonner'

import {
  ContactsPermissions,
  toApiError,
  type ContactDto,
  type ContactRole,
} from '@turbohesap/shared'

import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth/auth-context'
import { PermissionRequired } from '@/lib/auth/permission-gate'
import { PageWrapper } from '@/components/layout/page'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DataGrid, type ColumnDef } from '@/components/data-grid'
import { ContactDialog } from '../components/contact-dialog'
import { ContactsBulkBar } from '../components/bulk-actions-bar'
import { balanceSideLabel, balanceTone, formatMoney } from '../format'

const CSV_COLUMNS: { key: keyof ContactDto; header: string }[] = [
  { key: 'code', header: 'code' },
  { key: 'name', header: 'name' },
  { key: 'contactType', header: 'contactType' },
  { key: 'role', header: 'role' },
  { key: 'taxNumber', header: 'taxNumber' },
  { key: 'email', header: 'email' },
  { key: 'phone', header: 'phone' },
  { key: 'mobile', header: 'mobile' },
]

function csvCell(value: unknown): string {
  const s = value == null ? '' : String(value)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function exportContactsCsv(rows: ContactDto[]) {
  const lines = [
    CSV_COLUMNS.map((c) => c.header).join(','),
    ...rows.map((r) => CSV_COLUMNS.map((c) => csvCell(r[c.key])).join(',')),
  ]
  const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `cariler-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

const ROLE_LABEL: Record<ContactRole, string> = {
  customer: 'Müşteri', supplier: 'Tedarikçi', both: 'Müşteri+Tedarikçi', lead: 'Aday',
}
const ROLE_TONE: Record<ContactRole, 'success' | 'info' | 'secondary' | 'warning'> = {
  customer: 'success', supplier: 'info', both: 'secondary', lead: 'warning',
}

export function ContactsPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const canWrite = hasPermission(ContactsPermissions.contactsWrite)

  const [tag, setTag] = React.useState('')
  const [tagInput, setTagInput] = React.useState('')

  const query = useQuery({
    queryKey: ['contacts', 'contacts', { tag }],
    queryFn: () => api.contacts.contacts.list(tag ? { tag } : undefined),
    enabled: hasPermission(ContactsPermissions.contactsRead),
  })

  const [open, setOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<ContactDto | null>(null)
  const [selected, setSelected] = React.useState<ContactDto[]>([])
  // Bumping this remounts the grid, which clears its internal row selection.
  const [gridKey, setGridKey] = React.useState(0)
  const clearSelection = React.useCallback(() => {
    setSelected([])
    setGridKey((k) => k + 1)
  }, [])
  const rows = query.data ?? []

  const invalidate = () => qc.invalidateQueries({ queryKey: ['contacts', 'contacts'] })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.contacts.contacts.remove(id),
    onSuccess: () => { toast.success('Cari silindi'); void invalidate() },
    onError: (e) => toast.error('Silme başarısız', { description: toApiError(e).message }),
  })

  const columns: ColumnDef<ContactDto>[] = [
    { id: 'code', accessorKey: 'code', header: 'Kod', size: 120, cell: ({ row }) => <span className="font-mono text-xs">{row.original.code}</span> },
    {
      id: 'name', accessorKey: 'name', header: 'Ünvan', size: 240,
      cell: ({ row }) => (
        <span className="inline-flex items-center gap-1.5 font-medium">
          {row.original.contactType === 'company' ? <Building2 className="size-3.5 text-muted-foreground" /> : <User className="size-3.5 text-muted-foreground" />}
          {row.original.name}
        </span>
      ),
    },
    { id: 'role', accessorKey: 'role', header: 'Rol', size: 140, enableGrouping: true, cell: ({ row }) => <Badge variant={ROLE_TONE[row.original.role]}>{ROLE_LABEL[row.original.role]}</Badge> },
    { id: 'group', accessorFn: (c) => c.group?.name ?? '', header: 'Grup', size: 140, enableGrouping: true, cell: ({ row }) => row.original.group ? <Badge variant="outline">{row.original.group.name}</Badge> : <span className="text-muted-foreground">—</span> },
    { id: 'taxNumber', accessorKey: 'taxNumber', header: 'Vergi/TCKN', size: 130, cell: ({ row }) => <span className="font-mono text-xs text-muted-foreground">{row.original.taxNumber || row.original.nationalId || '—'}</span> },
    { id: 'phone', accessorFn: (c) => c.phone ?? c.mobile ?? '', header: 'Telefon', size: 130, cell: ({ row }) => <span className="text-muted-foreground">{row.original.phone || row.original.mobile || '—'}</span> },
    {
      id: 'balance', accessorKey: 'balance', header: 'Bakiye', size: 150,
      cell: ({ row }) => (
        <span className={`tabular-nums font-medium ${balanceTone(row.original.balanceSide)}`}>
          {formatMoney(row.original.balance, row.original.currencyCode)}
          <span className="ml-1 text-2xs font-normal text-muted-foreground">{balanceSideLabel(row.original.balanceSide)}</span>
        </span>
      ),
    },
    {
      id: 'tags', accessorFn: (c) => c.tags.join(', '), header: 'Etiketler', size: 180, enableSorting: false,
      cell: ({ row }) => row.original.tags.length
        ? (
          <div className="flex flex-wrap gap-1">
            {row.original.tags.map((t) => <Badge key={t} variant="outline" className="text-2xs">{t}</Badge>)}
          </div>
        )
        : <span className="text-muted-foreground">—</span>,
    },
    { id: 'isActive', accessorKey: 'isActive', header: 'Durum', size: 100, enableGrouping: true, cell: ({ row }) => <Badge variant={row.original.isActive ? 'success' : 'outline'}>{row.original.isActive ? 'Aktif' : 'Pasif'}</Badge> },
    ...(canWrite
      ? [{
          id: 'actions', header: '', size: 90, enableSorting: false, enableHiding: false, enableColumnFilter: false, enableGrouping: false,
          cell: ({ row }) => (
            <div className="flex justify-end gap-1">
              <Button variant="ghost" size="icon-sm" onClick={(e) => { e.stopPropagation(); setEditing(row.original); setOpen(true) }} aria-label="Düzenle"><Pencil className="size-4" /></Button>
              <Button variant="ghost" size="icon-sm" onClick={(e) => { e.stopPropagation(); if (confirm(`"${row.original.name}" silinsin mi?`)) deleteMutation.mutate(row.original.id) }} aria-label="Sil"><Trash2 className="size-4 text-destructive" /></Button>
            </div>
          ),
        } as ColumnDef<ContactDto>]
      : []),
  ]

  return (
    <PermissionRequired permission={ContactsPermissions.contactsRead}>
      <PageWrapper>
        <DataGrid
          key={gridKey}
          gridId="contacts.contacts"
          data={rows}
          columns={columns}
          getRowId={(c) => c.id}
          loading={query.isLoading}
          selection={canWrite ? 'multi' : 'none'}
          onSelectionChange={setSelected}
          onRowClick={(c) => navigate({ to: '/contacts/contacts/$id', params: { id: c.id } })}
          emptyText="Cari yok."
          toolbar={
            <div className="flex items-center gap-2">
              <form
                className="flex items-center gap-1"
                onSubmit={(e) => { e.preventDefault(); setTag(tagInput.trim()) }}
              >
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder="Etikete göre filtrele…"
                  className="h-9 w-48"
                />
                {tag ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => { setTag(''); setTagInput('') }}
                  >
                    Temizle
                  </Button>
                ) : null}
              </form>
              <Button variant="outline" onClick={() => exportContactsCsv(rows)} disabled={rows.length === 0}>
                <Download />Dışa aktar (CSV)
              </Button>
              {canWrite ? (
                <Button variant="outline" onClick={() => navigate({ to: '/contacts/contacts-import' })}>
                  <Upload />İçe aktar
                </Button>
              ) : null}
              {canWrite ? <Button onClick={() => { setEditing(null); setOpen(true) }}><Plus />Yeni cari</Button> : null}
            </div>
          }
        />
        {canWrite && selected.length > 0 ? (
          <ContactsBulkBar ids={selected.map((c) => c.id)} onCleared={clearSelection} />
        ) : null}
        <ContactDialog open={open} onOpenChange={setOpen} editing={editing} onSaved={invalidate} />
      </PageWrapper>
    </PermissionRequired>
  )
}
