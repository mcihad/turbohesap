import { createFileRoute } from '@tanstack/react-router'

import { EmployeeDetailPage } from '@/modules/hr/pages/employee-detail-page'

export const Route = createFileRoute('/_authed/hr/employees/$id')({
  component: EmployeeDetailPage,
})
