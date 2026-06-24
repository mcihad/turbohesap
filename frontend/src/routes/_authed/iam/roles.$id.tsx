import { createFileRoute } from '@tanstack/react-router'

import { RoleDetailPage } from '@/modules/iam/pages/role-detail-page'

export const Route = createFileRoute('/_authed/iam/roles/$id')({
  component: RoleDetailPage,
})
