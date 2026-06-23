import * as React from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'

import { exchangeCode } from '@/lib/auth/api'
import { useAuth } from '@/lib/auth/auth-context'
import { FullPageLoader } from '@/components/full-page-loader'

export const Route = createFileRoute('/auth/callback')({
  component: CallbackPage,
  // Keycloak redirects here with ?code & ?state (or ?error).
  validateSearch: (s: Record<string, unknown>) => ({
    code: typeof s.code === 'string' ? s.code : undefined,
    state: typeof s.state === 'string' ? s.state : undefined,
    error: typeof s.error === 'string' ? s.error : undefined,
  }),
})

function CallbackPage() {
  const { code, state, error } = Route.useSearch()
  const { setSession } = useAuth()
  const navigate = useNavigate()
  const ran = React.useRef(false)

  React.useEffect(() => {
    if (ran.current) return
    ran.current = true

    if (error || !code || !state) {
      toast.error('Giriş tamamlanamadı')
      void navigate({ to: '/login', replace: true })
      return
    }

    exchangeCode(code, state)
      .then((res) => {
        setSession(res)
        void navigate({ to: (res.redirect || '/dashboard') as string, replace: true })
      })
      .catch(() => {
        toast.error('Giriş tamamlanamadı')
        void navigate({ to: '/login', replace: true })
      })
  }, [code, state, error, setSession, navigate])

  return <FullPageLoader label="Giriş yapılıyor…" />
}
