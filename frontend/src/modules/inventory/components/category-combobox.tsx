import * as React from 'react'
import { ChevronDown, ChevronRight, FolderTree, Plus } from 'lucide-react'

import {
  categoryCheckState,
  toggleCategoryCascade,
  type CategoryDto,
} from '@turbohesap/shared'

import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'

interface CatNode {
  cat: CategoryDto
  children: CatNode[]
}

function buildTree(categories: CategoryDto[]): CatNode[] {
  const byParent = new Map<string | null, CategoryDto[]>()
  for (const c of categories) {
    const arr = byParent.get(c.parentId) ?? []
    arr.push(c)
    byParent.set(c.parentId, arr)
  }
  const build = (parentId: string | null): CatNode[] =>
    (byParent.get(parentId) ?? [])
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'tr'))
      .map((cat) => ({ cat, children: build(cat.id) }))
  return build(null)
}

// Category multi-select as a combobox: a compact trigger + a popover holding a
// collapsible, cascade tri-state checkbox tree (branches start collapsed).
export function CategoryCombobox({
  categories,
  value,
  onChange,
}: {
  categories: CategoryDto[]
  value: string[]
  onChange: (next: string[]) => void
}) {
  const [open, setOpen] = React.useState(false)
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set())
  const [q, setQ] = React.useState('')
  const tree = React.useMemo(() => buildTree(categories), [categories])

  const toggleExpand = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  const toggleCheck = (id: string) => onChange(toggleCategoryCascade(value, id, categories))

  const query = q.trim().toLowerCase()
  const matches = query
    ? categories.filter((c) => c.name.toLowerCase().includes(query))
    : []

  const selectedNames = value
    .map((id) => categories.find((c) => c.id === id)?.name)
    .filter((n): n is string => Boolean(n))

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex h-9 w-full items-center gap-2 rounded-md border bg-background px-3 text-sm transition-colors',
            'hover:border-primary/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            value.length > 0 && 'border-primary/40',
          )}
        >
          <FolderTree className="size-4 shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1 truncate text-left">
            {value.length === 0 ? (
              <span className="text-muted-foreground">Kategori seçin</span>
            ) : value.length <= 2 ? (
              selectedNames.join(', ')
            ) : (
              `${value.length} kategori seçili`
            )}
          </span>
          {value.length > 0 ? <Badge variant="secondary" className="px-1.5">{value.length}</Badge> : null}
          <Plus className="size-4 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] min-w-64 p-0">
        <div className="border-b p-2">
          <Input placeholder="Kategori ara" value={q} onChange={(e) => setQ(e.target.value)} className="h-8" />
        </div>
        <ScrollArea className="max-h-72">
          <div className="p-1">
            {categories.length === 0 ? (
              <p className="px-2 py-3 text-sm text-muted-foreground">Kategori yok.</p>
            ) : query ? (
              matches.length === 0 ? (
                <p className="px-2 py-3 text-sm text-muted-foreground">Eşleşme yok.</p>
              ) : (
                matches.map((cat) => (
                  <Row
                    key={cat.id}
                    label={cat.name}
                    depth={0}
                    state={categoryCheckState(cat.id, value, categories)}
                    onToggleCheck={() => toggleCheck(cat.id)}
                  />
                ))
              )
            ) : (
              tree.map((node) => (
                <TreeRows
                  key={node.cat.id}
                  node={node}
                  depth={0}
                  value={value}
                  categories={categories}
                  expanded={expanded}
                  onToggleExpand={toggleExpand}
                  onToggleCheck={toggleCheck}
                />
              ))
            )}
          </div>
        </ScrollArea>
        {value.length > 0 ? (
          <div className="border-t p-2">
            <Button variant="ghost" size="sm" className="w-full" onClick={() => onChange([])}>
              Seçimi temizle ({value.length})
            </Button>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  )
}

function TreeRows({
  node,
  depth,
  value,
  categories,
  expanded,
  onToggleExpand,
  onToggleCheck,
}: {
  node: CatNode
  depth: number
  value: string[]
  categories: CategoryDto[]
  expanded: Set<string>
  onToggleExpand: (id: string) => void
  onToggleCheck: (id: string) => void
}) {
  const isBranch = node.children.length > 0
  const isOpen = expanded.has(node.cat.id)
  return (
    <>
      <Row
        label={node.cat.name}
        depth={depth}
        state={categoryCheckState(node.cat.id, value, categories)}
        branch={isBranch}
        open={isOpen}
        onToggleExpand={() => onToggleExpand(node.cat.id)}
        onToggleCheck={() => onToggleCheck(node.cat.id)}
      />
      {isBranch && isOpen
        ? node.children.map((child) => (
            <TreeRows
              key={child.cat.id}
              node={child}
              depth={depth + 1}
              value={value}
              categories={categories}
              expanded={expanded}
              onToggleExpand={onToggleExpand}
              onToggleCheck={onToggleCheck}
            />
          ))
        : null}
    </>
  )
}

function Row({
  label,
  depth,
  state,
  branch,
  open,
  onToggleExpand,
  onToggleCheck,
}: {
  label: string
  depth: number
  state: 'checked' | 'indeterminate' | 'none'
  branch?: boolean
  open?: boolean
  onToggleExpand?: () => void
  onToggleCheck: () => void
}) {
  return (
    <div
      className="flex items-center gap-1.5 rounded-md py-1 pr-2 hover:bg-accent"
      style={{ paddingLeft: depth * 14 + 2 }}
    >
      {branch ? (
        <button type="button" onClick={onToggleExpand} className="grid size-5 shrink-0 place-items-center text-muted-foreground hover:text-foreground" aria-label={open ? 'Daralt' : 'Genişlet'}>
          {open ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
        </button>
      ) : (
        <span className="size-5 shrink-0" />
      )}
      <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 py-0.5">
        <Checkbox
          checked={state === 'checked' ? true : state === 'indeterminate' ? 'indeterminate' : false}
          onCheckedChange={onToggleCheck}
        />
        <span className="truncate text-sm">{label}</span>
      </label>
    </div>
  )
}
