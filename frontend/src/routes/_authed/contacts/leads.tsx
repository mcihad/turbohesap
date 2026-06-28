import { createFileRoute } from '@tanstack/react-router'

import { LeadsPage } from '@/modules/contacts/pages/leads-page'

export const Route = createFileRoute('/_authed/contacts/leads')({
  component: LeadsPage,
})
