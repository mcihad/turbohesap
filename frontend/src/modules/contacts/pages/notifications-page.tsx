import * as React from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell, CheckCheck } from 'lucide-react'
import { toast } from 'sonner'

import {
  ContactsPermissions,
  type NotificationDto,
} from '@turbohesap/shared'

import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { formatRelative } from '@/lib/datetime'
import { useAuth } from '@/lib/auth/auth-context'
import { PermissionRequired } from '@/lib/auth/permission-gate'
import { PageHeader, PageWrapper } from '@/components/layout/page'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { NOTIFICATION_ICON, notificationTarget } from '../components/notification-bell'

type Filter = 'all' | 'unread'

export function NotificationsPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const canRead = hasPermission(ContactsPermissions.notificationsRead)

  const [filter, setFilter] = React.useState<Filter>('all')

  const query = useQuery({
    queryKey: ['contacts', 'notifications', 'list', filter],
    queryFn: () => api.contacts.notifications.list(filter === 'unread' ? { unread: true } : undefined),
    enabled: canRead,
  })

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['contacts', 'notifications'] })
  }

  const markRead = useMutation({
    mutationFn: (id: string) => api.contacts.notifications.markRead(id),
    onSuccess: invalidate,
  })

  const markAllRead = useMutation({
    mutationFn: () => api.contacts.notifications.markAllRead(),
    onSuccess: () => { toast.success('Tüm bildirimler okundu işaretlendi'); invalidate() },
  })

  const items = query.data ?? []
  const hasUnread = items.some((n) => !n.readAt)

  const handleClick = (n: NotificationDto) => {
    if (!n.readAt) markRead.mutate(n.id)
    const target = notificationTarget(n)
    if (target) {
      void navigate(target)
    } else if (n.type === 'activity_due') {
      toast.message(n.title, { description: n.body ?? undefined })
    }
  }

  return (
    <PermissionRequired permission={ContactsPermissions.notificationsRead}>
      <PageWrapper className="max-w-3xl">
        <PageHeader
          title="Bildirimler"
          description="Atama, etkinlik, bahsedilme ve aşama değişikliği bildirimleri."
          actions={
            <div className="flex items-center gap-2">
              <Select value={filter} onValueChange={(v) => setFilter(v as Filter)}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tümü</SelectItem>
                  <SelectItem value="unread">Okunmamış</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                onClick={() => markAllRead.mutate()}
                disabled={markAllRead.isPending || !hasUnread}
              >
                <CheckCheck className="size-4" />
                Tümünü okundu işaretle
              </Button>
            </div>
          }
        />

        {query.isLoading ? (
          <p className="py-12 text-center text-sm text-muted-foreground">Yükleniyor…</p>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
            <Bell className="size-8" />
            <p className="text-sm">Bildirim yok.</p>
          </div>
        ) : (
          <div className="divide-y rounded-lg border">
            {items.map((n) => {
              const Icon = NOTIFICATION_ICON[n.type] ?? Bell
              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => handleClick(n)}
                  className={cn(
                    'flex w-full gap-3 px-4 py-3 text-left hover:bg-accent/50',
                    !n.readAt && 'bg-accent/30',
                  )}
                >
                  <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
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
                      <p className="text-xs text-muted-foreground">{n.body}</p>
                    ) : null}
                  </div>
                  {!n.readAt ? (
                    <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
                  ) : null}
                </button>
              )
            })}
          </div>
        )}
      </PageWrapper>
    </PermissionRequired>
  )
}
