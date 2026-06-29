import { createFileRoute } from '@tanstack/react-router'

import { OrderEntryPage } from '@/modules/orders/pages/order-entry-page'

export const Route = createFileRoute('/_authed/orders/$id/edit')({
  component: OrderEntryPage,
})
