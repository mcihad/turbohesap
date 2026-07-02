import { createFileRoute } from '@tanstack/react-router'

import { SubcontractPage } from '@/modules/production/pages/subcontract-page'

export const Route = createFileRoute('/_authed/production/subcontract/')({
  component: SubcontractPage,
})
