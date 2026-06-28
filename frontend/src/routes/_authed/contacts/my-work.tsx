import { createFileRoute } from '@tanstack/react-router'

import { MyWorkPage } from '@/modules/contacts/pages/my-work-page'

export const Route = createFileRoute('/_authed/contacts/my-work')({
  component: MyWorkPage,
})
