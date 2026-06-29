import { createFileRoute } from '@tanstack/react-router'

import { PayrollListPage } from '@/modules/hr/pages/payroll-list-page'

export const Route = createFileRoute('/_authed/hr/payroll/')({
  component: PayrollListPage,
})
