import { createFileRoute } from '@tanstack/react-router'

import { OrdersBoardPage } from '@/modules/production/pages/orders-board-page'

export const Route = createFileRoute('/_authed/production/orders/')({
  component: OrdersBoardPage,
})
