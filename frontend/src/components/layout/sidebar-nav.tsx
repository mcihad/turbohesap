import * as React from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
import { ChevronRight } from 'lucide-react'

import { cn } from '@/lib/utils'
import type { NavGroup, NavItem } from '@/config/navigation'
import { Badge } from '@/components/ui/badge'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

/* -------------------------------------------------------------------------- */
/* Search helpers                                                              */
/* -------------------------------------------------------------------------- */

function itemMatches(item: NavItem, q: string): boolean {
  const hay = [item.title, ...(item.keywords ?? [])].join(' ').toLowerCase()
  return hay.includes(q)
}

/** Returns a filtered copy of the tree keeping branches that contain matches. */
function filterItems(items: NavItem[], q: string): NavItem[] {
  if (!q) return items
  const out: NavItem[] = []
  for (const item of items) {
    if (item.children) {
      const kids = filterItems(item.children, q)
      if (kids.length || itemMatches(item, q)) {
        out.push({ ...item, children: kids.length ? kids : item.children })
      }
    } else if (itemMatches(item, q)) {
      out.push(item)
    }
  }
  return out
}

function collectPaths(items: NavItem[]): string[] {
  const out: string[] = []
  for (const item of items) {
    if (item.to) out.push(item.to)
    if (item.children) out.push(...collectPaths(item.children))
  }
  return out
}

/* -------------------------------------------------------------------------- */
/* Leaf link                                                                   */
/* -------------------------------------------------------------------------- */

function NavLeaf({
  item,
  depth,
  onNavigate,
}: {
  item: NavItem
  depth: number
  onNavigate?: () => void
}) {
  const Icon = item.icon
  return (
    <Link
      to={item.to}
      onClick={onNavigate}
      activeOptions={{ exact: item.to === '/' || !!item.exact }}
      className={cn(
        'group/leaf flex h-8 items-center gap-2.5 rounded-md px-2 text-sm text-sidebar-foreground/80 transition-colors',
        'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
        'data-[status=active]:bg-sidebar-accent data-[status=active]:font-medium data-[status=active]:text-sidebar-accent-foreground',
      )}
      style={{ paddingLeft: depth > 0 ? `${depth * 0.75 + 0.5}rem` : undefined }}
    >
      {Icon ? (
        <Icon className="size-4 shrink-0 text-muted-foreground group-data-[status=active]/leaf:text-current" />
      ) : (
        <span className="ml-1 size-1.5 shrink-0 rounded-full bg-current opacity-40" />
      )}
      <span className="flex-1 truncate">{item.title}</span>
      {item.badge && (
        <Badge variant="secondary" className="h-5 px-1.5 text-2xs">
          {item.badge}
        </Badge>
      )}
    </Link>
  )
}

/* -------------------------------------------------------------------------- */
/* Branch (collapsible)                                                        */
/* -------------------------------------------------------------------------- */

function NavBranch({
  item,
  depth,
  activePath,
  forceOpen,
  onNavigate,
}: {
  item: NavItem
  depth: number
  activePath: string
  forceOpen: boolean
  onNavigate?: () => void
}) {
  const Icon = item.icon
  const containsActive = React.useMemo(
    () => collectPaths(item.children ?? []).some((p) => activePath === p),
    [item.children, activePath],
  )
  // Derive open-state: a branch is open while searching, while it contains the
  // active route, or once the user has manually expanded it. No effect needed.
  const [userOpen, setUserOpen] = React.useState(false)
  const open = forceOpen || containsActive || userOpen

  return (
    <Collapsible open={open} onOpenChange={setUserOpen}>
      <CollapsibleTrigger
        className={cn(
          'group/branch flex h-8 w-full items-center gap-2.5 rounded-md px-2 text-sm text-sidebar-foreground/80 transition-colors',
          'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
          containsActive && 'text-sidebar-accent-foreground',
        )}
        style={{ paddingLeft: depth > 0 ? `${depth * 0.75 + 0.5}rem` : undefined }}
      >
        {Icon && (
          <Icon className="size-4 shrink-0 text-muted-foreground" />
        )}
        <span className="flex-1 truncate text-left">{item.title}</span>
        {item.badge && (
          <Badge variant="secondary" className="h-5 px-1.5 text-2xs">
            {item.badge}
          </Badge>
        )}
        <ChevronRight className="size-3.5 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]/branch:rotate-90" />
      </CollapsibleTrigger>
      <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
        <div className="mt-0.5 flex flex-col gap-0.5 border-l border-sidebar-border/70 pl-2.5 ml-3.5">
          {item.children!.map((child) => (
            <NavNode
              key={child.title}
              item={child}
              depth={0}
              activePath={activePath}
              forceOpen={forceOpen}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

function NavNode(props: {
  item: NavItem
  depth: number
  activePath: string
  forceOpen: boolean
  onNavigate?: () => void
}) {
  if (props.item.children) return <NavBranch {...props} />
  return (
    <NavLeaf
      item={props.item}
      depth={props.depth}
      onNavigate={props.onNavigate}
    />
  )
}

/* -------------------------------------------------------------------------- */
/* Collapsed icon rail                                                         */
/* -------------------------------------------------------------------------- */

function CollapsedItem({
  item,
  activePath,
}: {
  item: NavItem
  activePath: string
}) {
  const Icon = item.icon
  const active =
    item.to === activePath ||
    collectPaths(item.children ?? []).some((p) => p === activePath)

  // Shared icon-button styling; applied directly to the trigger element (button
  // or Link) so it has a real box — Radix anchors the tooltip/popover to it.
  const iconClass = cn(
    'flex size-9 items-center justify-center rounded-md text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
    active && 'bg-sidebar-accent text-sidebar-accent-foreground',
  )
  const glyph = Icon ? (
    <Icon className="size-[1.15rem]" />
  ) : (
    <span>{item.title[0]}</span>
  )

  if (item.children) {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <button type="button" className={iconClass}>
            {glyph}
          </button>
        </PopoverTrigger>
        <PopoverContent side="right" align="start" className="w-52 p-1">
          <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
            {item.title}
          </p>
          <div className="flex flex-col gap-0.5">
            {item.children.map((child) => (
              <NavLeaf key={child.title} item={child} depth={0} />
            ))}
          </div>
        </PopoverContent>
      </Popover>
    )
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link to={item.to} aria-label={item.title} className={iconClass}>
          {glyph}
        </Link>
      </TooltipTrigger>
      <TooltipContent side="right">{item.title}</TooltipContent>
    </Tooltip>
  )
}

/* -------------------------------------------------------------------------- */
/* Collapsed group (icon + flyout)                                             */
/* -------------------------------------------------------------------------- */

/** A labeled group shown as a single icon in the collapsed rail. The flyout
 * (the group's items) opens on hover with a mouse and on click/tap with touch —
 * the same anchor works for desktop and mobile. */
function CollapsedGroup({
  group,
  activePath,
  onNavigate,
}: {
  group: NavGroup
  activePath: string
  onNavigate?: () => void
}) {
  const [open, setOpen] = React.useState(false)
  const closeTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const cancelClose = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
  }
  const scheduleClose = () => {
    cancelClose()
    closeTimer.current = setTimeout(() => setOpen(false), 120)
  }
  React.useEffect(
    () => () => {
      if (closeTimer.current) clearTimeout(closeTimer.current)
    },
    [],
  )

  const Icon = group.icon ?? group.items[0]?.icon
  const active = collectPaths(group.items).some((p) => p === activePath)
  const iconClass = cn(
    'flex size-9 items-center justify-center rounded-md text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
    (active || open) && 'bg-sidebar-accent text-sidebar-accent-foreground',
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={group.label}
          className={iconClass}
          onPointerEnter={(e) => {
            if (e.pointerType === 'mouse') {
              cancelClose()
              setOpen(true)
            }
          }}
          onPointerLeave={(e) => {
            if (e.pointerType === 'mouse') scheduleClose()
          }}
        >
          {Icon ? <Icon className="size-[1.15rem]" /> : <span>{group.label?.[0]}</span>}
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="right"
        align="start"
        sideOffset={8}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onPointerEnter={cancelClose}
        onPointerLeave={(e) => {
          if (e.pointerType === 'mouse') scheduleClose()
        }}
        className="w-56 p-1"
      >
        <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
          {group.label}
        </p>
        <div className="flex flex-col gap-0.5">
          {group.items.map((item) => (
            <NavNode
              key={item.title}
              item={item}
              depth={0}
              activePath={activePath}
              forceOpen={false}
              onNavigate={() => {
                setOpen(false)
                onNavigate?.()
              }}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

/* -------------------------------------------------------------------------- */
/* Public component                                                            */
/* -------------------------------------------------------------------------- */

export function SidebarNav({
  groups,
  query,
  collapsed,
  onNavigate,
}: {
  groups: NavGroup[]
  query: string
  collapsed: boolean
  onNavigate?: () => void
}) {
  const activePath = useRouterState({
    select: (s) => s.location.pathname,
  })
  const q = query.trim().toLowerCase()

  if (collapsed) {
    return (
      <nav className="flex flex-col items-center gap-1 py-2">
        {groups.map((group, gi) => (
          <React.Fragment key={group.label ?? gi}>
            {gi > 0 && <div className="my-1 h-px w-6 bg-sidebar-border" />}
            {group.label ? (
              // Labeled group → a single representative icon with a flyout.
              <CollapsedGroup
                group={group}
                activePath={activePath}
                onNavigate={onNavigate}
              />
            ) : (
              // Label-less group → its items rendered as individual icons.
              group.items.map((item) => (
                <CollapsedItem
                  key={item.title}
                  item={item}
                  activePath={activePath}
                />
              ))
            )}
          </React.Fragment>
        ))}
      </nav>
    )
  }

  const filtered = groups
    .map((g) => ({ ...g, items: filterItems(g.items, q) }))
    .filter((g) => g.items.length)

  if (q && filtered.length === 0) {
    return (
      <p className="px-3 py-6 text-center text-sm text-muted-foreground">
        “{query}” için sonuç bulunamadı.
      </p>
    )
  }

  return (
    <nav className="flex flex-col gap-3 py-2">
      {filtered.map((group, gi) => (
        <NavGroupSection
          key={group.label ?? gi}
          group={group}
          activePath={activePath}
          forceOpen={Boolean(q)}
          onNavigate={onNavigate}
        />
      ))}
    </nav>
  )
}

/* -------------------------------------------------------------------------- */
/* Collapsible group section                                                   */
/* -------------------------------------------------------------------------- */

function NavGroupSection({
  group,
  activePath,
  forceOpen,
  onNavigate,
}: {
  group: NavGroup
  activePath: string
  forceOpen: boolean
  onNavigate?: () => void
}) {
  const items = group.items
  const containsActive = React.useMemo(
    () => collectPaths(items).some((p) => p === activePath),
    [items, activePath],
  )
  const [userOpen, setUserOpen] = React.useState<boolean | null>(null)

  const renderItems = () =>
    items.map((item) => (
      <NavNode
        key={item.title}
        item={item}
        depth={0}
        activePath={activePath}
        forceOpen={forceOpen}
        onNavigate={onNavigate}
      />
    ))

  // Groups without a label aren't collapsible — just render the items.
  if (!group.label) {
    return <div className="flex flex-col gap-0.5">{renderItems()}</div>
  }

  // Collapsed by default; the group holding the active route starts open, and
  // searching forces every group open. Once the user toggles, their choice wins.
  const open = forceOpen || (userOpen ?? containsActive)
  const GroupIcon = group.icon

  return (
    <Collapsible open={open} onOpenChange={setUserOpen}>
      <CollapsibleTrigger className="group/grp flex h-7 w-full select-none items-center justify-between gap-2 rounded-md px-2 text-2xs font-semibold tracking-wide text-muted-foreground/70 uppercase transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground">
        <span className="flex min-w-0 items-center gap-2">
          {GroupIcon && <GroupIcon className="size-3.5 shrink-0" />}
          <span className="truncate">{group.label}</span>
        </span>
        <ChevronRight className="size-3 shrink-0 text-muted-foreground/50 transition-transform duration-200 group-data-[state=open]/grp:rotate-90" />
      </CollapsibleTrigger>
      <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
        <div className="flex flex-col gap-0.5 pt-1">{renderItems()}</div>
      </CollapsibleContent>
    </Collapsible>
  )
}
