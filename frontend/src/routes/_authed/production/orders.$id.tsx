import { createFileRoute } from '@tanstack/react-router'

import { ManufacturingOrderDetailPage } from '@/modules/production/pages/order-detail-page'

export const Route = createFileRoute('/_authed/production/orders/$id')({
  component: ManufacturingOrderDetailPage,
})
