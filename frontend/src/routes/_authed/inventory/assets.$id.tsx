import { createFileRoute } from '@tanstack/react-router'

import { AssetDetailPage } from '@/modules/inventory/pages/asset-detail-page'

export const Route = createFileRoute('/_authed/inventory/assets/$id')({
  component: AssetDetailPage,
})
