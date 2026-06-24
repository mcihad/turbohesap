import * as React from 'react'
import { ChevronDown, RotateCcw, SlidersHorizontal } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Badge } from './badge'
import { Button } from './button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from './collapsible'

/**
 * FilterBar — a consistent, collapsible container for list/table filters. The
 * header (clickable to expand/collapse) shows the active-filter count and a
 * "Temizle" action; the body is a responsive grid of `FilterField`s. Collapsed
 * by default to keep pages tidy.
 *
 * The header background is theme-aware (`bg-muted/40` default) and overridable
 * via `headerClassName`.
 */
export function FilterBar({
  activeCount = 0,
  onClear,
  title = 'Filtreler',
  defaultOpen = false,
  headerClassName,
  className,
  children,
}: {
  activeCount?: number
  onClear?: () => void
  title?: string
  /** Start expanded (default: collapsed). */
  defaultOpen?: boolean
  /** Theme-aware header background / styling override. */
  headerClassName?: string
  className?: string
  children: React.ReactNode
}) {
  const [open, setOpen] = React.useState(defaultOpen)

  return (
    <div
      data-slot="filter-bar"
      className={cn('mb-4 overflow-hidden rounded-xl border bg-card', className)}
    >
      <Collapsible open={open} onOpenChange={setOpen}>
        <div
          className={cn(
            'flex items-center justify-between gap-2 bg-muted/40 px-3 py-2 transition-colors',
            open && 'border-b',
            headerClassName,
          )}
        >
          <CollapsibleTrigger className="group/fb -mx-1 flex flex-1 items-center gap-2 rounded-md px-1 py-0.5 text-sm font-medium outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40">
            <SlidersHorizontal className="size-4 text-muted-foreground" />
            {title}
            {activeCount > 0 ? (
              <Badge variant="secondary" className="h-5 px-1.5 tabular-nums">
                {activeCount}
              </Badge>
            ) : null}
            <ChevronDown className="ml-1 size-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]/fb:rotate-180" />
          </CollapsibleTrigger>
          {activeCount > 0 && onClear ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClear}
              className="h-7 shrink-0 text-muted-foreground"
            >
              <RotateCcw className="size-3.5" />
              <span className="hidden sm:inline">Temizle</span>
            </Button>
          ) : null}
        </div>
        <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
          <div className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-2 lg:grid-cols-4">
            {children}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}

/** A labelled cell inside a `FilterBar`. Span columns via `className` (e.g. `sm:col-span-2`). */
export function FilterField({
  label,
  htmlFor,
  className,
  children,
}: {
  label: string
  htmlFor?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label
        htmlFor={htmlFor}
        className="text-2xs font-medium tracking-wide text-muted-foreground uppercase"
      >
        {label}
      </label>
      {children}
    </div>
  )
}
