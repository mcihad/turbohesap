import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { LayoutGrid, List, Search } from 'lucide-react'

import { cn } from '@/lib/utils'
import { APPS } from '@/config/apps'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

export function AppLauncher({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const [view, setView] = React.useState<'grid' | 'list'>('grid')
  const [q, setQ] = React.useState('')

  const apps = APPS.filter((a) =>
    `${a.name} ${a.description}`.toLowerCase().includes(q.trim().toLowerCase()),
  )

  const close = () => onOpenChange(false)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl gap-0 overflow-hidden p-0">
        <DialogHeader className="space-y-3 border-b p-4 text-left">
          <div className="flex items-center justify-between gap-3 pr-9">
            <div>
              <DialogTitle>Applications</DialogTitle>
              <DialogDescription>
                Switch between workspace apps.
              </DialogDescription>
            </div>
            <ToggleGroup
              type="single"
              value={view}
              onValueChange={(v) => v && setView(v as 'grid' | 'list')}
              variant="outline"
              size="sm"
            >
              <ToggleGroupItem value="grid" aria-label="Grid view">
                <LayoutGrid />
              </ToggleGroupItem>
              <ToggleGroupItem value="list" aria-label="List view">
                <List />
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
          <div className="relative">
            <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search apps..."
              className="pl-8"
            />
          </div>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto p-4">
          {view === 'grid' ? (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {apps.map((app) => (
                <Link
                  key={app.id}
                  to={app.to}
                  onClick={close}
                  className="flex flex-col items-center gap-2 rounded-xl p-3 text-center transition-colors hover:bg-accent"
                >
                  <span
                    className="flex size-12 items-center justify-center rounded-2xl text-white shadow-sm"
                    style={{ backgroundColor: app.color }}
                  >
                    <app.icon className="size-6" />
                  </span>
                  <span className="text-xs font-medium">{app.name}</span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {apps.map((app) => (
                <Link
                  key={app.id}
                  to={app.to}
                  onClick={close}
                  className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-accent"
                >
                  <span
                    className="flex size-9 shrink-0 items-center justify-center rounded-lg text-white"
                    style={{ backgroundColor: app.color }}
                  >
                    <app.icon className="size-4.5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{app.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {app.description}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          )}
          {apps.length === 0 && (
            <p className={cn('py-10 text-center text-sm text-muted-foreground')}>
              No apps match “{q}”.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
