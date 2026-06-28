import { createFileRoute } from '@tanstack/react-router'

import { CrmDashboardPage } from '@/modules/contacts/pages/crm-dashboard-page'

export const Route = createFileRoute('/_authed/contacts/crm-dashboard')({
  component: CrmDashboardPage,
})
