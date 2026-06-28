import { useQuery } from '@tanstack/react-query'

import { api } from '@/lib/api'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const UNASSIGNED = '__unassigned__'

export function userLabel(u: { firstName: string; lastName: string; username: string }): string {
  return `${u.firstName} ${u.lastName}`.trim() || u.username
}

/** Sales-owner picker backed by the IAM users list. `null` = unassigned. */
export function OwnerSelect({
  value,
  onChange,
  placeholder = 'Sorumlu seçin',
  allowUnassigned = true,
}: {
  value: string | null
  onChange: (value: string | null) => void
  placeholder?: string
  allowUnassigned?: boolean
}) {
  const usersQuery = useQuery({
    queryKey: ['iam', 'users'],
    queryFn: () => api.iam.users.list(),
  })
  const users = usersQuery.data ?? []
  return (
    <Select
      value={value ?? UNASSIGNED}
      onValueChange={(v) => onChange(v === UNASSIGNED ? null : v)}
    >
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {allowUnassigned ? <SelectItem value={UNASSIGNED}>Atanmamış</SelectItem> : null}
        {users.map((u) => (
          <SelectItem key={u.id} value={u.id}>
            {userLabel(u)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
