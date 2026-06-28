import { createFileRoute } from '@tanstack/react-router'

import { ModuleDashboard } from '@/components/layout/module-dashboard'
import { invoicesModule } from '@/modules/invoices/module.config'
import { InvoicesDashboard } from '@/modules/invoices/components/invoices-dashboard'

export const Route = createFileRoute('/_authed/invoices/')({
  component: () => (
    <ModuleDashboard module={invoicesModule}>
      <InvoicesDashboard />
    </ModuleDashboard>
  ),
})
