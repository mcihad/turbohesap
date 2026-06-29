import { createFileRoute } from '@tanstack/react-router'

import { SalesOrdersListPage } from '@/modules/orders/pages/orders-list-page'

export const Route = createFileRoute('/_authed/orders/sales')({
  component: SalesOrdersListPage,
})
