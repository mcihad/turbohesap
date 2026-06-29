import { createFileRoute } from '@tanstack/react-router'

import { ModuleDashboard } from '@/components/layout/module-dashboard'
import { hrModule } from '@/modules/hr/module.config'
import { HrDashboard } from '@/modules/hr/components/hr-dashboard'

export const Route = createFileRoute('/_authed/hr/')({
  component: () => (
    <ModuleDashboard module={hrModule}>
      <HrDashboard />
    </ModuleDashboard>
  ),
})
