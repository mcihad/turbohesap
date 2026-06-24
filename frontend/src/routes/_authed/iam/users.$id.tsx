import { createFileRoute } from '@tanstack/react-router'

import { UserDetailPage } from '@/modules/iam/pages/user-detail-page'

export const Route = createFileRoute('/_authed/iam/users/$id')({
  component: UserDetailPage,
})
