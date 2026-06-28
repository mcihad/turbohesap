import { createFileRoute } from '@tanstack/react-router'

import { ContactGroupDetailPage } from '@/modules/contacts/pages/contact-group-detail-page'

export const Route = createFileRoute('/_authed/contacts/groups/$id')({
  component: ContactGroupDetailPage,
})
