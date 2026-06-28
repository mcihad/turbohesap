import { createFileRoute } from '@tanstack/react-router'

import { OpportunitiesPage } from '@/modules/contacts/pages/opportunities-page'

export const Route = createFileRoute('/_authed/contacts/opportunities/')({
  component: OpportunitiesPage,
})
