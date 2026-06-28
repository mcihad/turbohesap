import { createFileRoute } from '@tanstack/react-router'

import { ContactGroupsPage } from '@/modules/contacts/pages/contact-groups-page'

export const Route = createFileRoute('/_authed/contacts/groups/')({
  component: ContactGroupsPage,
})
