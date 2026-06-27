import { createFileRoute } from '@tanstack/react-router'

import { ModuleDashboard } from '@/components/layout/module-dashboard'
import { lookupsModule } from '@/modules/lookups/module.config'
import { LookupsDashboard } from '@/modules/lookups/components/lookups-dashboard'

export const Route = createFileRoute('/_authed/lookups/')({
  component: () => (
    <ModuleDashboard module={lookupsModule}>
      <LookupsDashboard />
    </ModuleDashboard>
  ),
})
