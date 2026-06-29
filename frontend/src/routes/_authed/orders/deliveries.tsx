import { createFileRoute } from '@tanstack/react-router'

import { DeliveriesListPage } from '@/modules/orders/pages/orders-list-page'

export const Route = createFileRoute('/_authed/orders/deliveries')({
  component: DeliveriesListPage,
})
