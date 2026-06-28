import { createFileRoute } from '@tanstack/react-router'

import { ContactsImportPage } from '@/modules/contacts/pages/contacts-import-page'

export const Route = createFileRoute('/_authed/contacts/contacts-import')({
  component: ContactsImportPage,
})
