import * as React from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Building2, Plus, User } from 'lucide-react'

import type { ContactDto, ContactRole } from '@turbohesap/shared'

import { api } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { DataGrid, type ColumnDef } from '@/components/data-grid'
import { ContactDialog } from '@/modules/contacts/components/contact-dialog'

// Local, deliberate duplicates of `modules/contacts/format.ts`'s tiny helpers —
// no precedent for cross-module frontend imports in this codebase (mirrors
// `product-picker-dialog.tsx`'s own local `money()`).
const ROLE_LABEL: Record<ContactRole, string> = {
  customer: 'Müşteri',
  supplier: 'Tedarikçi',
  both: 'Müşteri/Tedarikçi',
  lead: 'Aday',
}

function formatMoney(value: number, currency = 'TRY'): string {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency, maximumFractionDigits: 2 }).format(value)
}

/**
 * A reusable cari (contact) picker dialog — the `ContactPickerField`'s
 * magnifier opens this. Mirrors `product-picker-dialog.tsx`'s grid + select
 * shape (simpler chrome: contacts have no faceted-filter system like products,
 * so this is a standard modal dialog, not the floating/resizable one).
 *
 * Single mode: clicking a row picks it and closes immediately (a plain list
 * pick, no separate confirm step). Multi mode keeps the checkbox + confirm
 * footer since more than one choice is meaningful there.
 */
export function ContactPickerDialog({
  open,
  onOpenChange,
  mode = 'single',
  onConfirm,
  title = 'Cari seç',
  roleFilter,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode?: 'single' | 'multi'
  onConfirm: (contacts: ContactDto[]) => void
  title?: string
  /** Only offer contacts with this role (e.g. restrict to customers). */
  roleFilter?: ContactRole
}) {
  const qc = useQueryClient()
  const [search, setSearch] = React.useState('')
  const [selected, setSelected] = React.useState<ContactDto[]>([])
  const [createOpen, setCreateOpen] = React.useState(false)

  const contactsQuery = useQuery({
    queryKey: ['contacts', 'contacts'],
    queryFn: () => api.contacts.contacts.list(),
    enabled: open,
  })

  React.useEffect(() => {
    if (open) {
      setSearch('')
      setSelected([])
    }
  }, [open])

  const rows = React.useMemo(() => {
    const all = contactsQuery.data ?? []
    const byRole = roleFilter ? all.filter((c) => c.role === roleFilter || c.role === 'both') : all
    const q = search.trim().toLocaleLowerCase('tr')
    if (!q) return byRole
    return byRole.filter((c) =>
      `${c.name} ${c.code} ${c.taxNumber ?? ''} ${c.nationalId ?? ''}`.toLocaleLowerCase('tr').includes(q),
    )
  }, [contactsQuery.data, roleFilter, search])

  const columns = React.useMemo<ColumnDef<ContactDto>[]>(
    () => [
      {
        id: 'name',
        accessorKey: 'name',
        header: 'Ünvan',
        size: 260,
        cell: ({ row }) => (
          <span className="inline-flex items-center gap-1.5 font-medium">
            {row.original.contactType === 'company' ? (
              <Building2 className="size-3.5 text-muted-foreground" />
            ) : (
              <User className="size-3.5 text-muted-foreground" />
            )}
            {row.original.name}
          </span>
        ),
      },
      { id: 'code', accessorKey: 'code', header: 'Kod', size: 130, cell: ({ row }) => <span className="font-mono text-xs">{row.original.code}</span> },
      { id: 'role', accessorKey: 'role', header: 'Rol', size: 130, cell: ({ row }) => <Badge variant="secondary">{ROLE_LABEL[row.original.role]}</Badge> },
      { id: 'taxNumber', accessorKey: 'taxNumber', header: 'Vergi/TCKN', size: 120, cell: ({ row }) => <span className="font-mono text-xs text-muted-foreground">{row.original.taxNumber || row.original.nationalId || '—'}</span> },
      { id: 'phone', accessorFn: (c) => c.phone ?? c.mobile ?? '', header: 'Telefon', size: 120, cell: ({ row }) => row.original.phone || row.original.mobile || '—' },
      {
        id: 'balance',
        accessorKey: 'balance',
        header: 'Bakiye',
        size: 130,
        cell: ({ row }) => <span className="tabular-nums">{formatMoney(row.original.balance, row.original.currencyCode)}</span>,
      },
    ],
    [],
  )

  const pick = (contacts: ContactDto[]) => {
    onConfirm(contacts)
    onOpenChange(false)
  }

  return (
    // Always non-modal: `ContactPickerField` (and this dialog) is meant to be
    // droppable inside another already-open Dialog (e.g. a çek/senet form). Two
    // stacked Radix `modal` dialogs both portal to `document.body`, so without
    // this a click inside here can be misread as "outside" the parent dialog
    // and close it too (mirrors `product-picker-dialog.tsx`'s own fix for the
    // same class of bug). Outside-click/Escape-to-dismiss is disabled to match
    // — closes only via row-pick or the buttons.
    <Dialog open={open} onOpenChange={onOpenChange} modal={false}>
      <DialogContent
        className="flex h-[70vh] max-w-3xl flex-col gap-3 p-4 sm:max-w-4xl"
        forceOverlay
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="flex-row items-center justify-between gap-2 space-y-0">
          <DialogTitle>{title}</DialogTitle>
          <Button variant="outline" size="sm" className="mr-6 gap-1.5" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            Yeni cari ekle
          </Button>
        </DialogHeader>

        <div className="min-h-0 flex-1">
          <DataGrid
            fillHeight
            gridId="contact-picker"
            data={rows}
            columns={columns}
            getRowId={(c) => c.id}
            loading={contactsQuery.isLoading}
            selection={mode === 'multi' ? 'multi' : 'none'}
            onSelectionChange={setSelected}
            onRowClick={mode === 'single' ? (row) => pick([row]) : undefined}
            emptyText={search ? 'Filtreyle eşleşen cari yok.' : 'Cari yok.'}
            search={{ value: search, onChange: setSearch, placeholder: 'Ünvan, kod veya vergi/TCKN…' }}
          />
        </div>

        {mode === 'multi' ? (
          <DialogFooter className="items-center sm:justify-between">
            <span className="text-sm text-muted-foreground">
              {selected.length > 0 ? `${selected.length} cari seçili` : 'Cari seçilmedi'}
            </span>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                İptal
              </Button>
              <Button disabled={selected.length === 0} onClick={() => pick(selected)}>
                {`Ekle${selected.length ? ` (${selected.length})` : ''}`}
              </Button>
            </div>
          </DialogFooter>
        ) : null}
      </DialogContent>

      <ContactDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        editing={null}
        modal={false}
        onSaved={(saved) => {
          // Only close the create sub-dialog — stay on the picker grid (now
          // refreshed with the new contact) so the user can review/pick it,
          // rather than silently closing the whole picker out from under them.
          void qc.invalidateQueries({ queryKey: ['contacts', 'contacts'] })
          setSearch(saved.name)
        }}
      />
    </Dialog>
  )
}
