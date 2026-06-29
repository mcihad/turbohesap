import { createFileRoute } from '@tanstack/react-router'

import { QuotesListPage } from '@/modules/orders/pages/orders-list-page'

export const Route = createFileRoute('/_authed/orders/quotes')({
  component: QuotesListPage,
})
