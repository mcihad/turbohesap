import { createFileRoute } from '@tanstack/react-router'

import { ShiftsPage } from '@/modules/hr/pages/shifts-page'

export const Route = createFileRoute('/_authed/hr/shifts/')({
  component: ShiftsPage,
})
