import * as React from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import { LayoutGrid, LogOut, Repeat, Wifi, WifiOff } from 'lucide-react'
import { toast } from 'sonner'

import { toApiError } from '@turbohesap/shared'
import { useAuth } from '@/lib/auth/auth-context'
import { displayName } from '@/lib/auth/tokens'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

// Top app bar for the POS shell: register/session context on the left, live
// connection status + the current cashier (with a one-tap PIN switch) on the
// right. Template-independent — this is the POS's own chrome.
export function PosHeader({ left }: { left?: React.ReactNode }) {
  const { user, posSwitch, logout } = useAuth()
  const navigate = useNavigate()
  const online = useOnline()
  const [switchOpen, setSwitchOpen] = React.useState(false)
  const [pin, setPin] = React.useState('')

  const doSwitch = useMutation({
    mutationFn: () => posSwitch(pin),
    onSuccess: () => {
      setSwitchOpen(false)
      setPin('')
      toast.success('Kasiyer değişti')
    },
    onError: (e) => toast.error('Geçersiz PIN', { description: toApiError(e).message }),
  })

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b bg-card px-3">
      <div className="flex min-w-0 items-center gap-3">{left}</div>
      <div className="flex items-center gap-2">
        <span
          className={cn(
            'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-2xs font-medium',
            online ? 'bg-emerald-500/10 text-emerald-600' : 'bg-destructive/10 text-destructive',
          )}
          title={online ? 'Çevrimiçi' : 'Çevrimdışı'}
        >
          {online ? <Wifi className="size-3.5" /> : <WifiOff className="size-3.5" />}
          {online ? 'Çevrimiçi' : 'Çevrimdışı'}
        </span>
        <button
          type="button"
          onClick={() => setSwitchOpen(true)}
          className="flex items-center gap-2 rounded-md border bg-background px-3 py-1.5 text-sm hover:bg-accent"
        >
          <span className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-2xs font-semibold text-primary">
            {user ? initials(displayName(user)) : '?'}
          </span>
          <span className="max-w-32 truncate font-medium">{user ? displayName(user) : ''}</span>
          <Repeat className="size-3.5 text-muted-foreground" />
        </button>
        <Button
          variant="ghost"
          size="icon"
          title="Yönetime dön"
          onClick={() => navigate({ to: '/pos/dashboard' })}
        >
          <LayoutGrid className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          title="Çıkış"
          onClick={async () => {
            await logout()
            navigate({ to: '/pos/login' })
          }}
        >
          <LogOut className="size-4" />
        </Button>
      </div>

      <Dialog open={switchOpen} onOpenChange={setSwitchOpen}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>Kasiyer Değiştir</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              doSwitch.mutate()
            }}
            className="space-y-3"
          >
            <Input
              type="password"
              inputMode="numeric"
              autoFocus
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="PIN"
              className="h-12 text-center text-xl tracking-[0.4em]"
            />
            <Button type="submit" className="w-full" disabled={doSwitch.isPending || !pin}>
              Değiştir
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </header>
  )
}

function useOnline(): boolean {
  const [online, setOnline] = React.useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine,
  )
  React.useEffect(() => {
    const up = () => setOnline(true)
    const down = () => setOnline(false)
    window.addEventListener('online', up)
    window.addEventListener('offline', down)
    return () => {
      window.removeEventListener('online', up)
      window.removeEventListener('offline', down)
    }
  }, [])
  return online
}

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toLocaleUpperCase('tr'))
    .join('')
}
