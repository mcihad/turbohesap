import { createFileRoute } from '@tanstack/react-router'

import { ContactsPage } from '@/modules/contacts/pages/contacts-page'

export const Route = createFileRoute('/_authed/contacts/contacts/')({
  component: ContactsPage,
})
