import * as React from 'react'
import { useQuery } from '@tanstack/react-query'

import { IamPermissions, MODULES, type PermissionDto } from '@turbohesap/shared'

import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth/auth-context'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'

const MODULE_LABELS = new Map(MODULES.map((m) => [m.key, m.label]))

function moduleLabel(key: string): string {
  return MODULE_LABELS.get(key) ?? key.charAt(0).toUpperCase() + key.slice(1)
}

/**
 * PermissionGroups — renders permission keys grouped **by module** (first key
 * segment) in an accordion, each permission shown with its descriptive name (from
 * the catalog) + the raw key. Reused on the user / role detail pages.
 *
 * `single` → one group open at a time (first open). Default → all open.
 */
export function PermissionGroups({
  keys,
  single = false,
  emptyText = 'Yetki yok.',
}: {
  keys: string[]
  single?: boolean
  emptyText?: string
}) {
  const { hasPermission } = useAuth()
  const canCatalog = hasPermission(IamPermissions.permissionsRead)

  const permsQuery = useQuery({
    queryKey: ['iam', 'permissions'],
    queryFn: () => api.iam.permissions.list(),
    enabled: canCatalog,
  })

  const permMap = React.useMemo(() => {
    const m = new Map<string, PermissionDto>()
    for (const p of permsQuery.data ?? []) m.set(p.key, p)
    return m
  }, [permsQuery.data])

  const grouped = React.useMemo(() => {
    const m = new Map<string, { key: string; description: string }[]>()
    for (const k of [...keys].sort()) {
      const moduleKey = k.split('.')[0] || 'diğer'
      const arr = m.get(moduleKey) ?? []
      arr.push({ key: k, description: permMap.get(k)?.description ?? k })
      m.set(moduleKey, arr)
    }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [keys, permMap])

  if (keys.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyText}</p>
  }

  const items = grouped.map(([moduleKey, perms]) => (
    <AccordionItem key={moduleKey} value={moduleKey}>
      <AccordionTrigger>
        <span className="flex items-center gap-2">
          {moduleLabel(moduleKey)}
          <Badge variant="secondary" className="h-5 tabular-nums">
            {perms.length}
          </Badge>
        </span>
      </AccordionTrigger>
      <AccordionContent>
        <ul className="space-y-2">
          {perms.map((p) => (
            <li key={p.key} className="space-y-0.5">
              <p className="text-sm leading-tight">{p.description}</p>
              <p className="font-mono text-2xs text-muted-foreground">{p.key}</p>
            </li>
          ))}
        </ul>
      </AccordionContent>
    </AccordionItem>
  ))

  return single ? (
    <Accordion type="single" defaultValue={grouped[0]?.[0]} className="w-full">
      {items}
    </Accordion>
  ) : (
    <Accordion className="w-full">{items}</Accordion>
  )
}
