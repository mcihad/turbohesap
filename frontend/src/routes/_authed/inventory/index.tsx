import { createFileRoute } from '@tanstack/react-router'

import { ModuleDashboard } from '@/components/layout/module-dashboard'
import { inventoryModule } from '@/modules/inventory/module.config'
import { InventoryDashboard } from '@/modules/inventory/components/inventory-dashboard'

export const Route = createFileRoute('/_authed/inventory/')({
  component: () => (
    <ModuleDashboard module={inventoryModule}>
      <InventoryDashboard />
    </ModuleDashboard>
  ),
})
