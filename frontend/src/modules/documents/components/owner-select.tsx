// OwnerSelect — a picker over the IAM users list. A deliberate local duplicate of
// `contacts/components/owner-select.tsx` (each module owns its own small UI
// pieces rather than reaching into another module's components — see AGENTS.md
// §4). Used for the evrak/category "gizlilik" owner field.

import { useQuery } from '@tanstack/react-query'

import { api } from '@/lib/api'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export function userLabel(u: { firstName: string; lastName: string; username: string }): string {
  return `${u.firstName} ${u.lastName}`.trim() || u.username
}

/** Owner picker backed by the IAM users list. */
export function OwnerSelect({
  value,
  onChange,
  placeholder = 'Sahip seçin',
}: {
  value: string | null
  onChange: (value: string | null) => void
  placeholder?: string
}) {
  const usersQuery = useQuery({
    queryKey: ['iam', 'users'],
    queryFn: () => api.iam.users.list(),
  })
  const users = usersQuery.data ?? []
  return (
    <Select value={value ?? ''} onValueChange={(v) => onChange(v || null)}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {users.map((u) => (
          <SelectItem key={u.id} value={u.id}>
            {userLabel(u)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
