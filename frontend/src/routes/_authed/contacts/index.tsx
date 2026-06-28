import { createFileRoute } from '@tanstack/react-router'

import { ModuleDashboard } from '@/components/layout/module-dashboard'
import { contactsModule } from '@/modules/contacts/module.config'
import { ContactsDashboard } from '@/modules/contacts/components/contacts-dashboard'

export const Route = createFileRoute('/_authed/contacts/')({
  component: () => (
    <ModuleDashboard module={contactsModule}>
      <ContactsDashboard />
    </ModuleDashboard>
  ),
})
