import { createFileRoute, Navigate } from '@tanstack/react-router'

import { FullPageLoader } from '@/components/full-page-loader'
import { useAuth } from '@/lib/auth/auth-context'
import { PosLoginPage } from '@/modules/pos/pages/pos-login-page'

// Public POS login (PIN keypad). Outside the _pos gate so it never redirect-loops.
export const Route = createFileRoute('/pos/login')({
  component: PosLoginRoute,
})

function PosLoginRoute() {
  const { status } = useAuth()
  if (status === 'loading') return <FullPageLoader />
  if (status === 'authenticated') return <Navigate to="/pos" replace />
  return <PosLoginPage />
}
