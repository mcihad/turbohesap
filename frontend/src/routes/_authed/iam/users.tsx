import { createFileRoute } from '@tanstack/react-router'

import { UsersPage } from '@/modules/iam/pages/users-page'

export const Route = createFileRoute('/_authed/iam/users')({
  component: UsersPage,
})
