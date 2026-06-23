import * as React from 'react'
import { Bell, CheckCheck, CircleAlert, GitPullRequest, UserPlus } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'

interface Notification {
  id: string
  icon: typeof Bell
  title: string
  body: string
  time: string
  unread: boolean
  tone: 'default' | 'warning'
}

const SEED: Notification[] = [
  {
    id: '1',
    icon: GitPullRequest,
    title: 'Dağıtım tamamlandı',
    body: 'v2.4.0 sürümü canlı ortamda yayında.',
    time: '2dk',
    unread: true,
    tone: 'default',
  },
  {
    id: '2',
    icon: UserPlus,
    title: 'Yeni üye',
    body: 'Mira Operasyon ekibine katıldı.',
    time: '1sa',
    unread: true,
    tone: 'default',
  },
  {
    id: '3',
    icon: CircleAlert,
    title: 'Kota uyarısı',
    body: 'API kullanımı aylık sınırın %85\'ine ulaştı.',
    time: '3sa',
    unread: false,
    tone: 'warning',
  },
]

export function Notifications() {
  const [items, setItems] = React.useState(SEED)
  const unread = items.filter((i) => i.unread).length

  const markAll = () =>
    setItems((prev) => prev.map((i) => ({ ...i, unread: false })))

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Notifications"
          className="relative"
        >
          <Bell className="size-[1.15rem]" />
          {unread > 0 && (
            <span className="absolute top-1.5 right-1.5 flex size-2 items-center justify-center">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-primary" />
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-4 py-2.5">
          <p className="text-sm font-semibold">Bildirimler</p>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 text-xs"
            onClick={markAll}
          >
            <CheckCheck className="size-3.5" />
            Tümünü okundu işaretle
          </Button>
        </div>
        <ScrollArea className="max-h-80">
          <div className="flex flex-col">
            {items.map((n) => (
              <div
                key={n.id}
                className={cn(
                  'flex gap-3 border-b px-4 py-3 last:border-b-0',
                  n.unread && 'bg-accent/40',
                )}
              >
                <span
                  className={cn(
                    'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full',
                    n.tone === 'warning'
                      ? 'bg-warning/15 text-warning'
                      : 'bg-primary/15 text-primary',
                  )}
                >
                  <n.icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium">{n.title}</p>
                    <span className="shrink-0 text-2xs text-muted-foreground">
                      {n.time}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{n.body}</p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
        <div className="border-t p-1.5">
          <Button variant="ghost" size="sm" className="w-full text-xs">
            Tüm bildirimleri görüntüle
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
