import { createFileRoute } from '@tanstack/react-router'

import { ModuleDashboard } from '@/components/layout/module-dashboard'
import { documentsModule } from '@/modules/documents/module.config'
import { DocumentsDashboard } from '@/modules/documents/components/documents-dashboard'

export const Route = createFileRoute('/_authed/documents/')({
  component: () => (
    <ModuleDashboard module={documentsModule}>
      <DocumentsDashboard />
    </ModuleDashboard>
  ),
})
