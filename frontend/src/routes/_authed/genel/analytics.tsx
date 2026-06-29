import { Outlet, createFileRoute } from '@tanstack/react-router'

// Layout for the "Analiz" section. The overview page lives at the index
// (`analytics/index.tsx`); the per-module pages are nested children. This route
// only provides the <Outlet/> so those children render (mirrors `_authed.tsx`).
export const Route = createFileRoute('/_authed/genel/analytics')({
  component: () => <Outlet />,
})
