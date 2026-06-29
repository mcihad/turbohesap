import { createFileRoute } from '@tanstack/react-router'

import { LeavesPage } from '@/modules/hr/pages/leaves-page'

export const Route = createFileRoute('/_authed/hr/leaves')({
  component: LeavesPage,
})
