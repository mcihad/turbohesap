import { createFileRoute } from '@tanstack/react-router'

import { AssignmentsPage } from '@/modules/inventory/pages/assignments-page'

export const Route = createFileRoute('/_authed/inventory/assignments/')({
  component: AssignmentsPage,
})
