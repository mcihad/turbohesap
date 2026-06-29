import { createFileRoute } from '@tanstack/react-router'

import { PayslipPage } from '@/modules/hr/pages/payslip-page'

export const Route = createFileRoute('/_authed/hr/payroll/payslips/$id')({
  component: PayslipPage,
})
