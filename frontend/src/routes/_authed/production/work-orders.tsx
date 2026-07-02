import { createFileRoute } from '@tanstack/react-router'

import { WorkOrdersPage } from '@/modules/production/pages/work-orders-page'

export const Route = createFileRoute('/_authed/production/work-orders')({
  component: WorkOrdersPage,
})
