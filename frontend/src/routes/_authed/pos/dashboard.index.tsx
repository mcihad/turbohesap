import { createFileRoute } from '@tanstack/react-router'

import { PosDashboardPage } from '@/modules/pos/pages/pos-dashboard-page'

export const Route = createFileRoute('/_authed/pos/dashboard/')({
  component: PosDashboardPage,
})
