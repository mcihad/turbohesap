import * as React from 'react'
import { ChevronLeft, ChevronRight, LayoutGrid } from 'lucide-react'

import type { CategoryDto } from '@turbohesap/shared'
import { cn } from '@/lib/utils'

// Horizontal, touch- + mouse-drag scrollable category strip. Selecting a
// category drills into its subcategories (with a "back" chip showing the parent
// name); the product grid filters to the active category (and descendants).
export function CategoryStrip({
  categories,
  activeId,
  onSelect,
}: {
  categories: CategoryDto[]
  activeId: string | null
  onSelect: (id: string | null) => void
}) {
  // The category whose children we are currently showing (depth pointer).
  const [parentId, setParentId] = React.useState<string | null>(null)
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const drag = React.useRef<{ x: number; left: number; moved: boolean } | null>(null)

  const byId = React.useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories])
  const visible = React.useMemo(
    () => categories.filter((c) => (c.parentId ?? null) === parentId),
    [categories, parentId],
  )
  const parent = parentId ? byId.get(parentId) ?? null : null
  const hasChildren = React.useCallback(
    (id: string) => categories.some((c) => (c.parentId ?? null) === id),
    [categories],
  )

  // Pointer-drag horizontal scrolling (works with mouse + trackpad).
  const onPointerDown = (e: React.PointerEvent) => {
    const el = scrollRef.current
    if (!el) return
    drag.current = { x: e.clientX, left: el.scrollLeft, moved: false }
  }
  const onPointerMove = (e: React.PointerEvent) => {
    const el = scrollRef.current
    if (!el || !drag.current) return
    const dx = e.clientX - drag.current.x
    if (Math.abs(dx) > 4) drag.current.moved = true
    el.scrollLeft = drag.current.left - dx
  }
  const endDrag = () => {
    drag.current = null
  }

  const tap = (fn: () => void) => () => {
    // Suppress the click that ends a drag gesture.
    if (drag.current?.moved) return
    fn()
  }

  const pill =
    'flex h-10 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-colors'

  return (
    <div className="flex items-center gap-2 border-b bg-card px-3 py-2.5">
      {parent ? (
        <button
          type="button"
          onClick={() => {
            const grandParent = parent.parentId ?? null
            setParentId(grandParent)
            onSelect(grandParent)
          }}
          className={cn(pill, 'bg-background hover:bg-accent')}
        >
          <ChevronLeft className="size-4" />
          <span className="max-w-28 truncate">{parent.name}</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => onSelect(null)}
          className={cn(
            pill,
            activeId === null
              ? 'border-primary/60 bg-primary/10 text-primary'
              : 'bg-background hover:bg-accent',
          )}
        >
          <LayoutGrid className="size-4" />
          Tümü
        </button>
      )}

      <div
        ref={scrollRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
        className="no-scrollbar flex flex-1 cursor-grab gap-2 overflow-x-auto scroll-smooth select-none active:cursor-grabbing"
      >
        {visible.map((c) => {
          const isActive = c.id === activeId
          const drillable = hasChildren(c.id)
          return (
            <button
              key={c.id}
              type="button"
              onClick={tap(() => {
                onSelect(c.id)
                if (drillable) setParentId(c.id)
              })}
              className={cn(
                pill,
                isActive
                  ? 'border-primary/60 bg-primary/10 text-primary'
                  : 'bg-background hover:bg-accent',
              )}
            >
              <span className="max-w-40 truncate">{c.name}</span>
              {drillable ? <ChevronRight className="size-3.5 shrink-0 opacity-50" /> : null}
            </button>
          )
        })}
        {visible.length === 0 ? (
          <span className="flex h-10 items-center px-2 text-sm text-muted-foreground">Alt kategori yok</span>
        ) : null}
      </div>
    </div>
  )
}
