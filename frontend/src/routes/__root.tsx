import { createRootRoute, Outlet } from '@tanstack/react-router'

import { AuthProvider } from '@/lib/auth/auth-provider'

export const Route = createRootRoute({
  component: RootLayout,
})

// The root only provides auth context. The app shell lives in the `_authed`
// layout so unauthenticated routes (/login, /auth/callback) render bare.
function RootLayout() {
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  )
}
