import { createFileRoute } from '@tanstack/react-router'

import { SubcontractDetailPage } from '@/modules/production/pages/subcontract-detail-page'

export const Route = createFileRoute('/_authed/production/subcontract/$id')({
  component: SubcontractDetailPage,
})
