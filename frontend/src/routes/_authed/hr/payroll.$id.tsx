import { createFileRoute } from '@tanstack/react-router'

import { PayrollRunPage } from '@/modules/hr/pages/payroll-run-page'

export const Route = createFileRoute('/_authed/hr/payroll/$id')({
  component: PayrollRunPage,
})
