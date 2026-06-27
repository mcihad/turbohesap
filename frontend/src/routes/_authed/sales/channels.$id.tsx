import { createFileRoute } from '@tanstack/react-router'

import { SalesChannelDetailPage } from '@/modules/sales/pages/sales-channel-detail-page'

export const Route = createFileRoute('/_authed/sales/channels/$id')({
  component: SalesChannelDetailPage,
})
