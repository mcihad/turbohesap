import * as React from 'react'
import {
  Boxes,
  LifeBuoy,
  MessageSquarePlus,
  PanelLeftClose,
  Search,
  type LucideIcon,
} from 'lucide-react'
import { Link } from '@tanstack/react-router'

import { cn } from '@/lib/utils'
import { NAVIGATION } from '@/config/navigation'
import { useLayout } from '@/lib/layout/use-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { SidebarNav } from './sidebar-nav'
import { FeedbackDialog } from './feedback-dialog'

/** App brand chip — clicking it opens the application launcher. */
function AppIconButton({ collapsed }: { collapsed: boolean }) {
  const { setAppLauncherOpen } = useLayout()
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={() => setAppLauncherOpen(true)}
          aria-label="Open application launcher"
          className={cn(
            'flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm transition-transform hover:scale-105 active:scale-95',
          )}
        >
          <Boxes className="size-5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side={collapsed ? 'right' : 'bottom'}>
        Applications
      </TooltipContent>
    </Tooltip>
  )
}

/** Sidebar contents — shared by the desktop rail and the mobile sheet. */
export function SidebarInner({
  collapsed = false,
  onNavigate,
}: {
  collapsed?: boolean
  onNavigate?: () => void
}) {
  const { toggleSidebar } = useLayout()
  const [query, setQuery] = React.useState('')
  const [feedbackOpen, setFeedbackOpen] = React.useState(false)

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      {/* Header ----------------------------------------------------------- */}
      <div
        className={cn(
          'flex h-appbar items-center gap-2.5 border-b border-sidebar-border px-3',
          collapsed && 'justify-center px-0',
        )}
      >
        <AppIconButton collapsed={collapsed} />
        {!collapsed && (
          <>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-semibold leading-tight">
                Acme Console
              </span>
              <span className="truncate text-xs text-muted-foreground leading-tight">
                Production
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={toggleSidebar}
              aria-label="Collapse sidebar"
              className="hidden lg:inline-flex"
            >
              <PanelLeftClose className="size-4" />
            </Button>
          </>
        )}
      </div>

      {/* Search ----------------------------------------------------------- */}
      {!collapsed && (
        <div className="px-3 py-2.5">
          <div className="relative">
            <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search menu..."
              className="h-8 bg-background/60 pl-8 text-sm"
            />
          </div>
        </div>
      )}

      {/* Navigation ------------------------------------------------------- */}
      <ScrollArea className="min-h-0 flex-1">
        <div className={cn('px-3', collapsed && 'px-2')}>
          <SidebarNav
            groups={NAVIGATION}
            query={query}
            collapsed={collapsed}
            onNavigate={onNavigate}
          />
        </div>
      </ScrollArea>

      {/* Footer: help + feedback (icon-only, with tooltips) -------------- */}
      <div
        className={cn(
          'mt-auto border-t border-sidebar-border',
          collapsed
            ? 'flex flex-col items-center gap-1 py-2'
            : 'flex h-footer items-center gap-1 px-2',
        )}
      >
        <FooterAction
          icon={LifeBuoy}
          label="Help & Docs"
          to="/help"
          side={collapsed ? 'right' : 'top'}
        />
        <FooterAction
          icon={MessageSquarePlus}
          label="Send feedback"
          onClick={() => setFeedbackOpen(true)}
          side={collapsed ? 'right' : 'top'}
        />
      </div>

      <FeedbackDialog open={feedbackOpen} onOpenChange={setFeedbackOpen} />
    </div>
  )
}

/** Icon-only sidebar footer action with a tooltip label. */
function FooterAction({
  icon: Icon,
  label,
  to,
  onClick,
  side,
}: {
  icon: LucideIcon
  label: string
  to?: string
  onClick?: () => void
  side: 'top' | 'right'
}) {
  const className =
    'flex size-8 items-center justify-center rounded-md text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
  const inner = <Icon className="size-[1.05rem]" />
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {to ? (
          <Link to={to} aria-label={label} className={className}>
            {inner}
          </Link>
        ) : (
          <button
            type="button"
            onClick={onClick}
            aria-label={label}
            className={className}
          >
            {inner}
          </button>
        )}
      </TooltipTrigger>
      <TooltipContent side={side}>{label}</TooltipContent>
    </Tooltip>
  )
}
