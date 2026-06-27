import { createFileRoute } from '@tanstack/react-router'

import { ModuleDashboard } from '@/components/layout/module-dashboard'
import { orgModule } from '@/modules/org/module.config'
import { OrgDashboard } from '@/modules/org/components/org-dashboard'

export const Route = createFileRoute('/_authed/org/')({
  component: () => (
    <ModuleDashboard module={orgModule}>
      <OrgDashboard />
    </ModuleDashboard>
  ),
})
