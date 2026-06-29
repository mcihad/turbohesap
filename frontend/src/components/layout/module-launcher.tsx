import * as React from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { LifeBuoy, MessageSquarePlus } from 'lucide-react'

import { FeedbackPermissions, MODULES } from '@turbohesap/shared'

import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth/auth-context'
import { Can } from '@/lib/auth/permission-gate'
import { accessibleModules } from '@/lib/auth/access'
import { useLayout } from '@/lib/layout/use-layout'
import { useActiveModule } from '@/lib/layout/use-active-module'
import { APP_MODULES } from '@/modules/registry'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { FeedbackDialog } from './feedback-dialog'

const DESCRIPTIONS: Record<string, string> = Object.fromEntries(
  MODULES.map((m) => [m.key, m.description]),
)

// The module launcher — a grid of modules, used to switch modules on mobile
// (where the left rail is hidden). Opened from the sidebar's launcher button.
export function ModuleLauncher() {
  const { moduleLauncherOpen, setModuleLauncherOpen, setMobileSidebarOpen } =
    useLayout()
  const { hasPermission } = useAuth()
  const active = useActiveModule()
  const navigate = useNavigate()
  const [feedbackOpen, setFeedbackOpen] = React.useState(false)

  const modules = React.useMemo(
    () => accessibleModules(APP_MODULES, hasPermission),
    [hasPermission],
  )

  const close = () => {
    setModuleLauncherOpen(false)
    setMobileSidebarOpen(false)
  }

  return (
    <>
      <Dialog open={moduleLauncherOpen} onOpenChange={setModuleLauncherOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Modüller</DialogTitle>
            <DialogDescription>Açmak için bir modül seçin.</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {modules.map((m) => {
              const Icon = m.icon
              const isActive = active.key === m.key
              return (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => {
                    close()
                    void navigate({ to: m.home })
                  }}
                  className={cn(
                    'flex flex-col items-start gap-2 rounded-xl border p-3 text-left transition-colors hover:bg-accent hover:text-accent-foreground',
                    isActive && 'border-primary/40 bg-primary/5',
                  )}
                >
                  <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="size-5" />
                  </span>
                  <span className="text-sm font-medium">{m.label}</span>
                  <span className="line-clamp-2 text-xs text-muted-foreground">
                    {DESCRIPTIONS[m.key] ?? ''}
                  </span>
                </button>
              )
            })}
          </div>

          <div className="mt-1 flex items-center gap-2 border-t pt-3">
            <Link
              to="/help"
              onClick={close}
              className="flex flex-1 items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <LifeBuoy className="size-4" />
              Yardım
            </Link>
            <Can permission={FeedbackPermissions.create}>
              <button
                type="button"
                onClick={() => {
                  setModuleLauncherOpen(false)
                  setFeedbackOpen(true)
                }}
                className="flex flex-1 items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <MessageSquarePlus className="size-4" />
                Geri bildirim
              </button>
            </Can>
          </div>
        </DialogContent>
      </Dialog>

      <FeedbackDialog open={feedbackOpen} onOpenChange={setFeedbackOpen} />
    </>
  )
}
