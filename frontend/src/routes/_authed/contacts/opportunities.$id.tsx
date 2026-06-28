import { createFileRoute } from '@tanstack/react-router'

import { OpportunityDetailPage } from '@/modules/contacts/pages/opportunity-detail-page'

export const Route = createFileRoute('/_authed/contacts/opportunities/$id')({
  component: OpportunityDetailPage,
})
