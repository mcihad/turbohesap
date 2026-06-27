import { createFileRoute } from '@tanstack/react-router'

import { ModuleDashboard } from '@/components/layout/module-dashboard'
import { salesModule } from '@/modules/sales/module.config'
import { SalesDashboard } from '@/modules/sales/components/sales-dashboard'

export const Route = createFileRoute('/_authed/sales/')({
  component: () => (
    <ModuleDashboard module={salesModule}>
      <SalesDashboard />
    </ModuleDashboard>
  ),
})
