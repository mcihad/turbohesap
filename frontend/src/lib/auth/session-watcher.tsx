import * as React from 'react'
import { Clock, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useAuth } from './auth-context'
import { accessExpiryMs } from './tokens'

// Show the "extend session" prompt this long before the access token expires.
const WARN_BEFORE_MS = 30_000
const POLL_MS = 1_000

/**
 * Background session guard. While authenticated it polls the access-token expiry;
 * ~30s before it lapses it raises an elegant card with a live countdown and an
 * "Oturumu uzat" button that refreshes the token. If the countdown reaches zero
 * unattended, the session is dropped and the route guard sends the user to /login.
 *
 * Mount it once inside the authenticated shell.
 */
export function SessionWatcher() {
  const { status, tokens, refresh, logout, expire } = useAuth()
  // ms remaining when inside the warning window; null = card hidden.
  const [remaining, setRemaining] = React.useState<number | null>(null)
  const [busy, setBusy] = React.useState(false)

  const extend = React.useCallback(async () => {
    setBusy(true)
    const ok = await refresh()
    setBusy(false)
    if (ok) {
      setRemaining(null)
      toast.success('Oturum uzatıldı')
    } else {
      toast.error('Oturum uzatılamadı, lütfen tekrar giriş yapın')
    }
  }, [refresh])

  React.useEffect(() => {
    if (status !== 'authenticated' || !tokens) {
      setRemaining(null)
      return
    }
    const exp = accessExpiryMs(tokens)
    if (!exp) return

    const tick = () => {
      const left = exp - Date.now()
      if (left <= 0) {
        setRemaining(null)
        expire()
        toast.error('Oturum süresi doldu', { description: 'Lütfen tekrar giriş yapın.' })
        return
      }
      setRemaining(left <= WARN_BEFORE_MS ? left : null)
    }

    tick()
    const interval = window.setInterval(tick, POLL_MS)
    return () => window.clearInterval(interval)
  }, [status, tokens, expire])

  if (remaining == null) return null

  const seconds = Math.ceil(remaining / 1000)
  const pct = Math.max(0, Math.min(100, (remaining / WARN_BEFORE_MS) * 100))
  const urgent = remaining <= 10_000

  return (
    <div
      role="alertdialog"
      aria-live="assertive"
      className="fixed right-4 bottom-4 z-[100] w-[min(360px,calc(100vw-2rem))] animate-in fade-in slide-in-from-bottom-4 duration-300"
    >
      <div className="overflow-hidden rounded-xl border bg-card text-card-foreground shadow-lg ring-1 ring-black/5">
        <div className="flex items-start gap-3 p-4">
          <div
            className={cn(
              'grid size-10 shrink-0 place-items-center rounded-full',
              urgent ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary',
            )}
          >
            <Clock className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Oturumunuz sona eriyor</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Güvenlik için{' '}
              <span className={cn('font-semibold tabular-nums', urgent ? 'text-destructive' : 'text-foreground')}>
                {seconds} sn
              </span>{' '}
              içinde çıkış yapılacak.
            </p>
          </div>
        </div>

        <div className="h-1 w-full bg-muted">
          <div
            className={cn(
              'h-full transition-[width] duration-1000 ease-linear',
              urgent ? 'bg-destructive' : 'bg-primary',
            )}
            style={{ width: `${pct}%` }}
          />
        </div>

        <div className="flex items-center justify-end gap-2 p-3">
          <Button variant="ghost" size="sm" disabled={busy} onClick={() => void logout()}>
            Çıkış yap
          </Button>
          <Button size="sm" disabled={busy} onClick={() => void extend()}>
            <ShieldCheck className="size-4" />
            {busy ? 'Uzatılıyor…' : 'Oturumu uzat'}
          </Button>
        </div>
      </div>
    </div>
  )
}
