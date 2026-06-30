// Reusable single-select pickers for the Demirbaş & Zimmet dialogs: personel
// (HR employee), cari (contact, used for supplier/vendor) and şube (org branch).
// Each fetches its own list (gated by the relevant read permission) and stores
// the selected id. Pass `allowNone` to offer a "—" (clear) option.
import { useQuery } from '@tanstack/react-query'

import { ContactsPermissions, HrPermissions, OrgPermissions } from '@turbohesap/shared'

import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth/auth-context'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const NONE = '__none__'

function OptionsSelect({
  value,
  onChange,
  options,
  placeholder,
  allowNone,
  loading,
  disabled,
}: {
  value: string | null
  onChange: (id: string | null) => void
  options: { id: string; label: string }[]
  placeholder: string
  allowNone?: boolean
  loading?: boolean
  disabled?: boolean
}) {
  return (
    <Select
      value={value ?? NONE}
      onValueChange={(v) => onChange(v === NONE ? null : v)}
      disabled={disabled}
    >
      <SelectTrigger>
        <SelectValue placeholder={loading ? 'Yükleniyor…' : placeholder} />
      </SelectTrigger>
      <SelectContent>
        {allowNone ? <SelectItem value={NONE}>—</SelectItem> : null}
        {options.map((o) => (
          <SelectItem key={o.id} value={o.id}>
            {o.label}
          </SelectItem>
        ))}
        {options.length === 0 && !loading ? (
          <div className="px-2 py-1.5 text-sm text-muted-foreground">Kayıt yok</div>
        ) : null}
      </SelectContent>
    </Select>
  )
}

export function EmployeeSelect({
  value,
  onChange,
  placeholder = 'Personel seçin',
  allowNone = false,
  disabled,
}: {
  value: string | null
  onChange: (id: string | null) => void
  placeholder?: string
  allowNone?: boolean
  disabled?: boolean
}) {
  const { hasPermission } = useAuth()
  const q = useQuery({
    queryKey: ['hr', 'employees'],
    queryFn: () => api.hr.employees.list(),
    enabled: hasPermission(HrPermissions.read),
  })
  const options = (q.data ?? []).map((e) => ({ id: e.id, label: e.fullName }))
  return (
    <OptionsSelect
      value={value}
      onChange={onChange}
      options={options}
      placeholder={placeholder}
      allowNone={allowNone}
      loading={q.isLoading}
      disabled={disabled}
    />
  )
}

export function ContactSelect({
  value,
  onChange,
  placeholder = 'Cari seçin',
  allowNone = true,
  disabled,
}: {
  value: string | null
  onChange: (id: string | null) => void
  placeholder?: string
  allowNone?: boolean
  disabled?: boolean
}) {
  const { hasPermission } = useAuth()
  const q = useQuery({
    queryKey: ['contacts', 'contacts'],
    queryFn: () => api.contacts.contacts.list(),
    enabled: hasPermission(ContactsPermissions.contactsRead),
  })
  const options = (q.data ?? []).map((c) => ({ id: c.id, label: c.name }))
  return (
    <OptionsSelect
      value={value}
      onChange={onChange}
      options={options}
      placeholder={placeholder}
      allowNone={allowNone}
      loading={q.isLoading}
      disabled={disabled}
    />
  )
}

export function BranchSelect({
  value,
  onChange,
  placeholder = 'Şube seçin',
  allowNone = true,
  disabled,
}: {
  value: string | null
  onChange: (id: string | null) => void
  placeholder?: string
  allowNone?: boolean
  disabled?: boolean
}) {
  const { hasPermission } = useAuth()
  const q = useQuery({
    queryKey: ['org', 'branches'],
    queryFn: () => api.org.branches.list(),
    enabled: hasPermission(OrgPermissions.branchesRead),
  })
  const options = (q.data ?? []).map((b) => ({ id: b.id, label: b.name }))
  return (
    <OptionsSelect
      value={value}
      onChange={onChange}
      options={options}
      placeholder={placeholder}
      allowNone={allowNone}
      loading={q.isLoading}
      disabled={disabled}
    />
  )
}
