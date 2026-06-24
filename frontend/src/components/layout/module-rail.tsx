import * as React from 'react'
import { Link } from '@tanstack/react-router'

import { cn } from '@/lib/utils'
import { useActiveModule } from '@/lib/layout/use-active-module'
import { useAuth } from '@/lib/auth/auth-context'
import { accessibleModules } from '@/lib/auth/access'
import { APP_MODULES } from '@/modules/registry'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

// The far-left vertical rail of module icons. Clicking one opens that module
// (its home route) — the shell stays, the sidebar + content swap. Only modules
// the user can access (≥1 visible nav item) are shown.
export function ModuleRail() {
  const active = useActiveModule()
  const { hasPermission } = useAuth()
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
                  'flex size-10 items-center justify-center rounded-lg transition-colors',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
                )}
              >
                <Icon className="size-5" />
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">{m.label}</TooltipContent>
          </Tooltip>
        )
      })}
    </nav>
  )
}
