import * as React from 'react'
import { toast } from 'sonner'

import { useAuth } from './auth-context'
import { accessExpiryMs } from './tokens'

// Show the "extend session" prompt this long before the access token expires.
const WARN_BEFORE_MS = 30_000
const POLL_MS = 5_000
const TOAST_ID = 'session-expiry'

/**
 * Background session guard. While authenticated it polls the access-token
 * expiry; ~30s before it lapses it raises a sticky toast with an "Oturumu uzat"
 * action that refreshes the token. If the token lapses unattended, the session
 * is dropped and the route guard sends the user back to /login.
 *
 * Renders nothing — mount it once inside the authenticated shell.
 */
export function SessionWatcher() {
  const { status, tokens, refresh, expire } = useAuth()
  const warnedExpRef = React.useRef(0)

  const extend = React.useCallback(async () => {
    const ok = await refresh()
    toast.dismiss(TOAST_ID)
    if (ok) toast.success('Oturum uzatıldı')
    else toast.error('Oturum uzatılamadı, lütfen tekrar giriş yapın')
  }, [refresh])

  React.useEffect(() => {
    if (status !== 'authenticated' || !tokens) return

    const exp = accessExpiryMs(tokens)
    if (!exp) return

    const tick = () => {
      const msLeft = exp - Date.now()

      if (msLeft <= 0) {
        toast.dismiss(TOAST_ID)
        expire()
        toast.error('Oturum süresi doldu', {
          description: 'Lütfen tekrar giriş yapın.',
        })
        return
      }

      if (msLeft <= WARN_BEFORE_MS && warnedExpRef.current !== exp) {
        warnedExpRef.current = exp
        toast.warning('Oturumunuz birazdan sona erecek', {
          id: TOAST_ID,
          duration: Infinity,
          description: 'Devam etmek için oturumunuzu uzatın.',
          action: { label: 'Oturumu uzat', onClick: () => void extend() },
        })
      }
    }

    tick()
    const interval = window.setInterval(tick, POLL_MS)
    return () => window.clearInterval(interval)
  }, [status, tokens, expire, extend])

  return null
}
