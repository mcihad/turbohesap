import { createFileRoute } from '@tanstack/react-router'

import { ModuleDashboard } from '@/components/layout/module-dashboard'
import { ordersModule } from '@/modules/orders/module.config'
import { OrdersDashboard } from '@/modules/orders/components/orders-dashboard'

export const Route = createFileRoute('/_authed/orders/')({
  component: () => (
    <ModuleDashboard module={ordersModule}>
      <OrdersDashboard />
    </ModuleDashboard>
  ),
})
