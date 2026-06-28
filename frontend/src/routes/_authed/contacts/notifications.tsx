import { createFileRoute } from '@tanstack/react-router'

import { NotificationsPage } from '@/modules/contacts/pages/notifications-page'

export const Route = createFileRoute('/_authed/contacts/notifications')({
  component: NotificationsPage,
})
