import { createFileRoute } from '@tanstack/react-router'

import { ModuleDashboard } from '@/components/layout/module-dashboard'
import { stocktakeModule } from '@/modules/stocktake/module.config'
import { StocktakeDashboard } from '@/modules/stocktake/components/stocktake-dashboard'

export const Route = createFileRoute('/_authed/stocktake/')({
  component: () => (
    <ModuleDashboard module={stocktakeModule}>
      <StocktakeDashboard />
    </ModuleDashboard>
  ),
})
