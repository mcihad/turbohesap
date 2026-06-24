import * as React from 'react'
import {
  LifeBuoy,
  MessageSquarePlus,
  PanelLeftClose,
  Search,
  type LucideIcon,
} from 'lucide-react'
import { Link } from '@tanstack/react-router'

import { cn } from '@/lib/utils'
import { useLayout } from '@/lib/layout/use-layout'
import { useActiveModule } from '@/lib/layout/use-active-module'
import { useAuth } from '@/lib/auth/auth-context'
import { filterNavByPermission } from '@/lib/auth/access'
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

/** Sidebar contents — shared by the desktop rail and the mobile sheet. Renders
 * the active module's navigation; the left module rail switches modules. */
export function SidebarInner({
  collapsed = false,
  onNavigate,
}: {
  collapsed?: boolean
  onNavigate?: () => void
}) {
  const { toggleSidebar } = useLayout()
  const { hasPermission } = useAuth()
  const activeModule = useActiveModule()
  const ModuleIcon = activeModule.icon
  const [query, setQuery] = React.useState('')
  const [feedbackOpen, setFeedbackOpen] = React.useState(false)

  // Only show nav items the user is allowed to access.
  const nav = React.useMemo(
    () => filterNavByPermission(activeModule.nav, hasPermission),
    [activeModule, hasPermission],
  )

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      {/* Header ----------------------------------------------------------- */}
      <div
        className={cn(
          'flex h-appbar items-center gap-2.5 border-b border-sidebar-border px-3',
          collapsed && 'justify-center px-0',
        )}
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <ModuleIcon className="size-5" />
        </span>
        {!collapsed && (
          <>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-semibold leading-tight">
                {activeModule.label}
              </span>
              <span className="truncate text-xs text-muted-foreground leading-tight">
                TurboHesap
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={toggleSidebar}
              aria-label="Kenar çubuğunu daralt"
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
              placeholder="Menüde ara..."
              className="h-8 bg-background/60 pl-8 text-sm"
            />
          </div>
        </div>
      )}

      {/* Navigation ------------------------------------------------------- */}
      <ScrollArea className="min-h-0 flex-1">
        <div className={cn('px-3', collapsed && 'px-2')}>
          <SidebarNav
            groups={nav}
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
