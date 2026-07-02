import * as React from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Search } from 'lucide-react'

import type { ContactDto, ContactRole } from '@turbohesap/shared'

import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { EntityCombobox } from '@/modules/invoices/components/entity-combobox'
import { ContactDialog } from '@/modules/contacts/components/contact-dialog'
import { ContactPickerDialog } from './contact-picker-dialog'

/**
 * A cari (contact) autocomplete with a magnifier that opens the richer
 * {@link ContactPickerDialog} (grid, search, select). Mirrors
 * `product-picker-field.tsx` — use this everywhere a single contact is picked
 * instead of a bare combobox.
 */
export function ContactPickerField({
  value,
  onChange,
  placeholder = 'Cari seç…',
  disabled,
  className,
  title = 'Cari seç',
  roleFilter,
}: {
  value: string | null
  onChange: (contact: ContactDto | null) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  title?: string
  /** Only offer contacts with this role (e.g. restrict to customers). */
  roleFilter?: ContactRole
}) {
  const qc = useQueryClient()
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [createOpen, setCreateOpen] = React.useState(false)
  // Lazy: only fetch the typeahead list once the user interacts with the field.
  const [activated, setActivated] = React.useState(false)

  const contactsQuery = useQuery({
    queryKey: ['contacts', 'contacts'],
    queryFn: () => api.contacts.contacts.list(),
    enabled: activated || dialogOpen,
  })
  const all = contactsQuery.data ?? []
  const contacts = React.useMemo(
    () => (roleFilter ? all.filter((c) => c.role === roleFilter || c.role === 'both') : all),
    [all, roleFilter],
  )

  return (
    <div className={className} onFocusCapture={() => setActivated(true)} onPointerEnter={() => setActivated(true)}>
      <div className="flex items-center gap-1.5">
        <div className="min-w-0 flex-1">
          <EntityCombobox
            items={contacts}
            value={value}
            onChange={(_id, item) => onChange(item)}
            getId={(c) => c.id}
            getLabel={(c) => c.name}
            getSub={(c) => c.code}
            placeholder={placeholder}
            searchPlaceholder="Cari ara (ünvan / kod / vergi no)…"
            emptyText="Cari bulunamadı"
            disabled={disabled}
            onCreate={() => setCreateOpen(true)}
            createLabel="Yeni cari ekle"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-9 shrink-0"
          disabled={disabled}
          onClick={() => setDialogOpen(true)}
          aria-label="Cari ara"
          title="Gelişmiş cari arama"
        >
          <Search className="size-4" />
        </Button>
      </div>

      <ContactPickerDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode="single"
        title={title}
        roleFilter={roleFilter}
        onConfirm={(picked) => onChange(picked[0] ?? null)}
      />

      <ContactDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        editing={null}
        modal={false}
        onSaved={(saved) => {
          void qc.invalidateQueries({ queryKey: ['contacts', 'contacts'] })
          onChange(saved)
        }}
      />
    </div>
  )
}
