import * as React from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AtSign,
  Bell,
  CalendarClock,
  CheckCheck,
  GitBranch,
  UserPlus,
  type LucideIcon,
} from 'lucide-react'
import { toast } from 'sonner'

import {
  ContactsPermissions,
  type NotificationDto,
  type NotificationType,
} from '@turbohesap/shared'

import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { formatRelative } from '@/lib/datetime'
import { useAuth } from '@/lib/auth/auth-context'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'

/** Icon for each notification type — reused by the notifications page. */
export const NOTIFICATION_ICON: Record<NotificationType, LucideIcon> = {
  assignment: UserPlus,
  activity_due: CalendarClock,
  mention: AtSign,
  stage_change: GitBranch,
}

/** Resolve a notification's linked entity to an in-app navigation, if possible. */
export function notificationTarget(
  n: NotificationDto,
): { to: '/contacts/opportunities/$id'; params: { id: string } } | null {
  if (n.entityType === 'Opportunity' && n.entityId) {
    return { to: '/contacts/opportunities/$id', params: { id: n.entityId } }
  }
  return null
}

const UNREAD_KEY = ['contacts', 'notifications', 'unread']
const LIST_KEY = ['contacts', 'notifications', 'recent']

/** Header bell with unread badge + recent-notifications popover. */
export function NotificationBell() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const canRead = hasPermission(ContactsPermissions.notificationsRead)

  const [open, setOpen] = React.useState(false)

  const unreadQuery = useQuery({
    queryKey: UNREAD_KEY,
    queryFn: () => api.contacts.notifications.unreadCount(),
    enabled: canRead,
    refetchInterval: 60_000,
  })

  const listQuery = useQuery({
    queryKey: LIST_KEY,
    queryFn: () => api.contacts.notifications.list({ limit: 10 }),
    enabled: canRead && open,
  })

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: UNREAD_KEY })
    void qc.invalidateQueries({ queryKey: LIST_KEY })
    void qc.invalidateQueries({ queryKey: ['contacts', 'notifications', 'list'] })
  }

  const markRead = useMutation({
    mutationFn: (id: string) => api.contacts.notifications.markRead(id),
    onSuccess: invalidate,
  })

  const markAllRead = useMutation({
    mutationFn: () => api.contacts.notifications.markAllRead(),
    onSuccess: () => { toast.success('Tüm bildirimler okundu işaretlendi'); invalidate() },
  })

  if (!canRead) return null

  const unread = unreadQuery.data?.count ?? 0
  const items = listQuery.data ?? []

  const handleItemClick = (n: NotificationDto) => {
    if (!n.readAt) markRead.mutate(n.id)
    const target = notificationTarget(n)
    setOpen(false)
    if (target) {
      void navigate(target)
    } else if (n.type === 'activity_due') {
      toast.message(n.title, { description: n.body ?? undefined })
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Bildirimler" className="relative">
          <Bell className="size-[1.15rem]" />
          {unread > 0 ? (
            <span className="absolute top-0.5 right-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-primary-foreground">
              {unread > 99 ? '99+' : unread}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between border-b px-4 py-2.5">
          <p className="text-sm font-semibold">Bildirimler</p>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 text-xs"
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending || unread === 0}
          >
            <CheckCheck className="size-3.5" />
            Tümünü okundu işaretle
          </Button>
        </div>

        <ScrollArea className="max-h-96">
          <div className="flex flex-col">
            {listQuery.isLoading ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">Yükleniyor…</p>
            ) : items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">Bildirim yok.</p>
            ) : (
              items.map((n) => {
                const Icon = NOTIFICATION_ICON[n.type] ?? Bell
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => handleItemClick(n)}
                    className={cn(
                      'flex w-full gap-3 border-b px-4 py-3 text-left last:border-b-0 hover:bg-accent/50',
                      !n.readAt && 'bg-accent/30',
                    )}
                  >
                    <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                      <Icon className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-medium">{n.title}</p>
                        <span className="shrink-0 text-2xs text-muted-foreground">
                          {formatRelative(n.createdAt)}
                        </span>
                      </div>
                      {n.body ? (
                        <p className="line-clamp-2 text-xs text-muted-foreground">{n.body}</p>
                      ) : null}
                    </div>
                    {!n.readAt ? (
                      <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
                    ) : null}
                  </button>
                )
              })
            )}
          </div>
        </ScrollArea>

        <div className="border-t p-1.5">
          <Button asChild variant="ghost" size="sm" className="w-full text-xs">
            <Link to="/contacts/notifications" onClick={() => setOpen(false)}>
              Tümünü gör
            </Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
