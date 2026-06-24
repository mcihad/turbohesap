import { createFileRoute, Navigate } from '@tanstack/react-router'

export const Route = createFileRoute('/_authed/')({
  component: IndexRedirect,
})

// The root path is a gate: authenticated users (the `_authed` guard already
// ensured it) land on the dashboard.
function IndexRedirect() {
  return <Navigate to="/genel/dashboard" replace />
}
