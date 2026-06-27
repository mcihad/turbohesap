import { createFileRoute } from '@tanstack/react-router'

import { SalesChannelsPage } from '@/modules/sales/pages/sales-channels-page'

export const Route = createFileRoute('/_authed/sales/channels/')({
  component: SalesChannelsPage,
})
