import { createFileRoute, Navigate } from '@tanstack/react-router'

import { AppShell } from '@/components/layout/app-shell'
import { FullPageLoader } from '@/components/full-page-loader'
import { useAuth } from '@/lib/auth/auth-context'
import { SessionWatcher } from '@/lib/auth/session-watcher'

export const Route = createFileRoute('/_authed')({
  component: AuthedLayout,
})

// Gate for every authenticated page. While the session is resolving we show a
// loader; without a valid session we bounce to /login; otherwise we render the
// app shell (which provides the <Outlet/>) plus the background session watcher.
function AuthedLayout() {
  const { status } = useAuth()

  if (status === 'loading') return <FullPageLoader />
  if (status === 'unauthenticated') return <Navigate to="/login" replace />

  return (
    <>
      <SessionWatcher />
      <AppShell />
    </>
  )
}
