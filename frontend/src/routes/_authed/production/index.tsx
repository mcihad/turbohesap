import { createFileRoute } from '@tanstack/react-router'

import { ModuleDashboard } from '@/components/layout/module-dashboard'
import { productionModule } from '@/modules/production/module.config'
import { ProductionDashboard } from '@/modules/production/components/production-dashboard'

export const Route = createFileRoute('/_authed/production/')({
  component: () => (
    <ModuleDashboard module={productionModule}>
      <ProductionDashboard />
    </ModuleDashboard>
  ),
})
