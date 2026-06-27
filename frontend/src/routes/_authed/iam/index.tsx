import { createFileRoute } from '@tanstack/react-router'

import { ModuleDashboard } from '@/components/layout/module-dashboard'
import { iamModule } from '@/modules/iam/module.config'
import { IamDashboard } from '@/modules/iam/components/iam-dashboard'

export const Route = createFileRoute('/_authed/iam/')({
  component: () => (
    <ModuleDashboard module={iamModule}>
      <IamDashboard />
    </ModuleDashboard>
  ),
})
