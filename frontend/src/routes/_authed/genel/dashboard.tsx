import { createFileRoute } from '@tanstack/react-router'

import { ModuleDashboard } from '@/components/layout/module-dashboard'
import { genelModule } from '@/modules/genel/module.config'
import { GenelDashboard } from '@/modules/genel/components/genel-dashboard'

export const Route = createFileRoute('/_authed/genel/dashboard')({
  component: () => (
    <ModuleDashboard module={genelModule}>
      <GenelDashboard />
    </ModuleDashboard>
  ),
})
