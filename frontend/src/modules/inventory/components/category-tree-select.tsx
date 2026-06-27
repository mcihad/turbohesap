// CategoryTreeSelect — pick a category from the tree. Renders the categories as a
// single Select with depth-based indentation, so the hierarchy is visible while
// staying a familiar dropdown.

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'

import { type CategoryDto, InventoryPermissions } from '@turbohesap/shared'

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

interface Flat {
  id: string
  label: string
  depth: number
}

function flatten(cats: CategoryDto[]): Flat[] {
  const byParent = new Map<string | null, CategoryDto[]>()
  for (const c of cats) {
    const arr = byParent.get(c.parentId) ?? []
    arr.push(c)
    byParent.set(c.parentId, arr)
  }
  const out: Flat[] = []
  const walk = (parentId: string | null, depth: number) => {
    for (const c of (byParent.get(parentId) ?? []).sort(
      (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
    )) {
      out.push({ id: c.id, label: c.name, depth })
      walk(c.id, depth + 1)
    }
  }
  walk(null, 0)
  return out
}

export function CategoryTreeSelect({
  value,
  onChange,
  placeholder = 'Kategori seçin',
}: {
  value: string | null | undefined
  onChange: (id: string | null) => void
  placeholder?: string
}) {
  const { hasPermission } = useAuth()
  const canRead = hasPermission(InventoryPermissions.categoriesRead)
  const query = useQuery({
    queryKey: ['inventory', 'categories'],
    queryFn: () => api.inventory.categories.list(),
    enabled: canRead,
  })
  const flat = React.useMemo(() => flatten(query.data ?? []), [query.data])

  return (
    <Select
      value={value ?? NONE}
      onValueChange={(v) => onChange(v === NONE ? null : v)}
      disabled={!canRead}
    >
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>
          <span className="text-muted-foreground">Kategori yok</span>
        </SelectItem>
        {flat.map((c) => (
          <SelectItem key={c.id} value={c.id}>
            <span style={{ paddingLeft: c.depth * 14 }}>
              {c.depth > 0 ? '↳ ' : ''}
              {c.label}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
