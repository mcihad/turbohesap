// Ortak seçiciler — üretim dialoglarında ve editörlerinde tekrar kullanılan
// şube / iş merkezi / cari (fasoncu) seçicileri.

import { useQuery } from '@tanstack/react-query'

import { OrgPermissions } from '@turbohesap/shared'

import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth/auth-context'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { EntityCombobox } from '@/modules/invoices/components/entity-combobox'
import { ContactPickerField } from '@/components/contact-picker/contact-picker-field'

const NO_BRANCH = '__none__'

/** Şube seçici (Select). value === '' → "Şube yok". */
export function BranchSelect({
  value,
  onChange,
  placeholder = 'Şube seç',
  allowNone = true,
  noneLabel = 'Şube yok',
  disabled,
}: {
  value: string
  onChange: (id: string) => void
  placeholder?: string
  allowNone?: boolean
  noneLabel?: string
  disabled?: boolean
}) {
  const { hasPermission } = useAuth()
  const branchesQuery = useQuery({
    queryKey: ['org', 'branches'],
    queryFn: () => api.org.branches.list(),
    enabled: hasPermission(OrgPermissions.branchesRead),
  })
  return (
    <Select
      value={value || NO_BRANCH}
      onValueChange={(v) => onChange(v === NO_BRANCH ? '' : v)}
      disabled={disabled}
    >
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {allowNone ? <SelectItem value={NO_BRANCH}>{noneLabel}</SelectItem> : null}
        {(branchesQuery.data ?? []).map((b) => (
          <SelectItem key={b.id} value={b.id}>
            {b.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

/** İş merkezi seçici (typeahead). */
export function WorkCenterSelect({
  value,
  onChange,
  placeholder = 'İş merkezi seç',
  disabled,
}: {
  value: string | null
  onChange: (id: string | null) => void
  placeholder?: string
  disabled?: boolean
}) {
  const query = useQuery({
    queryKey: ['production', 'work-centers'],
    queryFn: () => api.production.workCenters.list(),
  })
  return (
    <EntityCombobox
      items={query.data ?? []}
      value={value}
      onChange={(id) => onChange(id)}
      getId={(w) => w.id}
      getLabel={(w) => w.name}
      getSub={(w) => w.code}
      placeholder={placeholder}
      searchPlaceholder="İş merkezi ara…"
      emptyText="İş merkezi bulunamadı"
      disabled={disabled}
    />
  )
}

/** Cari (fasoncu) seçici — tedarikçi/her ikisi rolündeki cariler. */
export function SupplierSelect({
  value,
  onChange,
  placeholder = 'Fasoncu / cari seç',
  disabled,
}: {
  value: string | null
  onChange: (id: string | null) => void
  placeholder?: string
  disabled?: boolean
}) {
  return (
    <ContactPickerField
      value={value}
      onChange={(contact) => onChange(contact?.id ?? null)}
      placeholder={placeholder}
      disabled={disabled}
      title="Fasoncu / cari seç"
      roleFilter="supplier"
    />
  )
}
