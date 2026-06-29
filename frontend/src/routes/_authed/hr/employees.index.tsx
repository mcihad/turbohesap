import { createFileRoute } from '@tanstack/react-router'

import { EmployeesListPage } from '@/modules/hr/pages/employees-list-page'

export const Route = createFileRoute('/_authed/hr/employees/')({
  component: EmployeesListPage,
})
