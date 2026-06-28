import { createFileRoute } from '@tanstack/react-router'
import { ModuleDashboard } from '@/components/layout/module-dashboard'
import { financeModule } from '@/modules/finance/module.config'
import { FinanceDashboard } from '@/modules/finance/components/finance-dashboard'

export const Route = createFileRoute('/_authed/finance/')({
  component: () => (
    <ModuleDashboard module={financeModule}>
      <FinanceDashboard />
    </ModuleDashboard>
  ),
})
