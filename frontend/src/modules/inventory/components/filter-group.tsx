import * as React from 'react'
import { ChevronDown, type LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

// An elegant, collapsible filter group — a soft icon chip, a title, an active
// count pill and a chevron. Smoothly expands via a grid-rows trick (no JS
// measuring). The reusable wrapper every filter box lives in.
export function FilterGroup({
  icon: Icon,
  title,
  count = 0,
  defaultOpen = false,
  children,
}: {
  icon?: LucideIcon
  title: string
  count?: number
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = React.useState(defaultOpen)
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="group flex w-full items-center gap-2.5 px-4 py-2.5 text-left transition-colors hover:bg-muted/40"
      >
        {Icon ? (
          <span
            className={cn(
              'grid size-7 shrink-0 place-items-center rounded-lg transition-colors',
              count > 0
                ? 'bg-primary/12 text-primary'
                : 'bg-muted text-muted-foreground group-hover:text-foreground',
            )}
          >
            <Icon className="size-4" />
          </span>
        ) : null}
        <span className="flex-1 truncate text-sm font-medium">{title}</span>
        {count > 0 ? (
          <span className="grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1.5 text-2xs font-semibold text-primary-foreground tabular-nums">
            {count}
          </span>
        ) : null}
        <ChevronDown
          className={cn(
            'size-4 shrink-0 text-muted-foreground/70 transition-transform duration-200',
            open && 'rotate-180',
          )}
        />
      </button>
      <div className={cn('grid transition-[grid-template-rows] duration-200 ease-out', open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
        <div className="overflow-hidden">
          <div className="space-y-3 px-4 pb-4 pt-0.5">{children}</div>
        </div>
      </div>
    </div>
  )
}
