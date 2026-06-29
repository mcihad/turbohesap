import { createFileRoute } from '@tanstack/react-router'

import { OrderDetailPage } from '@/modules/orders/pages/order-detail-page'

export const Route = createFileRoute('/_authed/orders/$id')({
  component: OrderDetailPage,
})
