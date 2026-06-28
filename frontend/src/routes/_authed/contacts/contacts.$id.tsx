import { createFileRoute } from '@tanstack/react-router'

import { ContactDetailPage } from '@/modules/contacts/pages/contact-detail-page'

export const Route = createFileRoute('/_authed/contacts/contacts/$id')({
  component: ContactDetailPage,
})
