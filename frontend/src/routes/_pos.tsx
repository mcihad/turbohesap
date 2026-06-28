import { createFileRoute, Navigate, Outlet } from '@tanstack/react-router'

import { FullPageLoader } from '@/components/full-page-loader'
import { useAuth } from '@/lib/auth/auth-context'
import { SessionWatcher } from '@/lib/auth/session-watcher'

// The POS shell: a full-screen, template-independent layout with its own chrome
// (NO AppShell sidebar/navbar). Auth-gated like _authed, but unauthenticated
// users go to the PIN login at /pos/login instead of the main /login.
export const Route = createFileRoute('/_pos')({
  component: PosLayout,
})

function PosLayout() {
  const { status } = useAuth()
  if (status === 'loading') return <FullPageLoader />
  if (status === 'unauthenticated') return <Navigate to="/pos/login" replace />
  return (
    <>
      <SessionWatcher />
      <div className="h-svh w-full overflow-hidden bg-background text-foreground">
        <Outlet />
      </div>
    </>
  )
}
