import { createFileRoute } from '@tanstack/react-router'

import { ShiftSchedulePage } from '@/modules/hr/pages/shift-schedule-page'

export const Route = createFileRoute('/_authed/hr/shift-schedule/')({
  component: ShiftSchedulePage,
})
