import * as React from 'react'
import { ChevronRight, File, Folder, FolderOpen, type LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

export interface TreeNode {
  id: string
  label: string
  /** Override the default file/folder icon. */
  icon?: LucideIcon
  badge?: string
  children?: TreeNode[]
}

interface TreeContextValue {
  selectedId: string | null
  onSelect: (id: string) => void
  expanded: Set<string>
  toggle: (id: string) => void
}

const TreeContext = React.createContext<TreeContextValue | null>(null)

/**
 * A generic, themed tree / file-explorer view.
 * - Uncontrolled expansion (seed with `defaultExpanded`).
 * - Single selection, surfaced via `onSelect`.
 */
export function Tree({
  data,
  defaultExpanded = [],
  defaultSelected = null,
  onSelect,
  className,
}: {
  data: TreeNode[]
  defaultExpanded?: string[]
  defaultSelected?: string | null
  onSelect?: (node: TreeNode) => void
  className?: string
}) {
  const [expanded, setExpanded] = React.useState<Set<string>>(
    () => new Set(defaultExpanded),
  )
  const [selectedId, setSelectedId] = React.useState<string | null>(
    defaultSelected,
  )

  const toggle = React.useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const flat = React.useMemo(() => flatten(data), [data])

  const handleSelect = React.useCallback(
    (id: string) => {
      setSelectedId(id)
      const node = flat.get(id)
      if (node) onSelect?.(node)
    },
    [flat, onSelect],
  )

  const ctx = React.useMemo(
    () => ({ selectedId, onSelect: handleSelect, expanded, toggle }),
    [selectedId, handleSelect, expanded, toggle],
  )

  return (
    <TreeContext.Provider value={ctx}>
      <ul role="tree" className={cn('select-none text-sm', className)}>
        {data.map((node) => (
          <TreeItem key={node.id} node={node} depth={0} />
        ))}
      </ul>
    </TreeContext.Provider>
  )
}

function flatten(
  nodes: TreeNode[],
  map = new Map<string, TreeNode>(),
): Map<string, TreeNode> {
  for (const n of nodes) {
    map.set(n.id, n)
    if (n.children) flatten(n.children, map)
  }
  return map
}

function TreeItem({ node, depth }: { node: TreeNode; depth: number }) {
  const ctx = React.useContext(TreeContext)!
  const isBranch = Boolean(node.children?.length)
  const isOpen = ctx.expanded.has(node.id)
  const isSelected = ctx.selectedId === node.id
  const Icon =
    node.icon ?? (isBranch ? (isOpen ? FolderOpen : Folder) : File)

  return (
    <li role="treeitem" aria-expanded={isBranch ? isOpen : undefined}>
      <button
        type="button"
        onClick={() => {
          ctx.onSelect(node.id)
          if (isBranch) ctx.toggle(node.id)
        }}
        className={cn(
          'group flex h-8 w-full items-center gap-1.5 rounded-md pr-2 text-left transition-colors',
          'hover:bg-accent hover:text-accent-foreground',
          isSelected && 'bg-accent font-medium text-accent-foreground',
        )}
        style={{ paddingLeft: `${depth * 1.1 + 0.5}rem` }}
      >
        <ChevronRight
          className={cn(
            'size-3.5 shrink-0 text-muted-foreground transition-transform duration-200',
            isBranch ? (isOpen && 'rotate-90') : 'opacity-0',
          )}
        />
        <Icon
          className={cn(
            'size-4 shrink-0',
            isBranch ? 'text-primary' : 'text-muted-foreground',
          )}
        />
        <span className="flex-1 truncate">{node.label}</span>
        {node.badge && (
          <span className="text-2xs text-muted-foreground">{node.badge}</span>
        )}
      </button>

      {isBranch && isOpen && (
        <ul role="group">
          {node.children!.map((child) => (
            <TreeItem key={child.id} node={child} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  )
}
