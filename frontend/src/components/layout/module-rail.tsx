import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { LifeBuoy, MessageSquarePlus, type LucideIcon } from 'lucide-react'

import { FeedbackPermissions } from '@turbohesap/shared'

import { cn } from '@/lib/utils'
import { useActiveModule } from '@/lib/layout/use-active-module'
import { useAuth } from '@/lib/auth/auth-context'
import { Can } from '@/lib/auth/permission-gate'
import { accessibleModules } from '@/lib/auth/access'
import { APP_MODULES } from '@/modules/registry'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { FeedbackDialog } from './feedback-dialog'

const itemClass =
  'flex size-10 items-center justify-center rounded-lg text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-foreground'

// The far-left vertical rail of module icons. Clicking one opens that module
// (its home route) — the shell stays, the sidebar + content swap. Only modules
// the user can access are shown. Help + feedback sit pinned at the bottom.
export function ModuleRail() {
  const active = useActiveModule()
  const { hasPermission } = useAuth()
  const [feedbackOpen, setFeedbackOpen] = React.useState(false)
  const modules = React.useMemo(
    () => accessibleModules(APP_MODULES, hasPermission),
    [hasPermission],
  )

  return (
    <nav
      aria-label="Modüller"
      className="hidden w-14 shrink-0 flex-col items-center gap-1 border-r border-sidebar-border bg-sidebar py-3 lg:flex"
    >
      <div className="mb-2 flex size-9 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
        T
      </div>

      {modules.map((m) => {
        const Icon = m.icon
        const isActive = active.key === m.key
        return (
          <Tooltip key={m.key}>
            <TooltipTrigger asChild>
              <Link
                to={m.home}
                aria-label={m.label}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  itemClass,
                  isActive &&
                    'bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent',
                )}
              >
                <Icon className="size-5" />
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">{m.label}</TooltipContent>
          </Tooltip>
        )
      })}

      {/* Pinned to the bottom: help + feedback */}
      <div className="mt-auto flex flex-col items-center gap-1">
        <RailLink icon={LifeBuoy} label="Yardım ve Dokümanlar" to="/help" />
        <Can permission={FeedbackPermissions.create}>
          <RailButton
            icon={MessageSquarePlus}
            label="Geri bildirim gönder"
            onClick={() => setFeedbackOpen(true)}
          />
        </Can>
      </div>

      <FeedbackDialog open={feedbackOpen} onOpenChange={setFeedbackOpen} />
    </nav>
  )
}

function RailLink({
  icon: Icon,
  label,
  to,
}: {
  icon: LucideIcon
  label: string
  to: string
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link to={to} aria-label={label} className={itemClass}>
          <Icon className="size-5" />
        </Link>
      </TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  )
}

function RailButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: LucideIcon
  label: string
  onClick: () => void
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          data-feedback-ignore
          aria-label={label}
          onClick={onClick}
          className={itemClass}
        >
          <Icon className="size-5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  )
}
