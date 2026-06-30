import { createFileRoute } from '@tanstack/react-router'

import { AttendancePage } from '@/modules/hr/pages/attendance-page'

export const Route = createFileRoute('/_authed/hr/attendance/')({
  component: AttendancePage,
})
