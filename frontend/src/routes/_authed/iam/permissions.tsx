import { createFileRoute } from '@tanstack/react-router'

import { PermissionsPage } from '@/modules/iam/pages/permissions-page'

export const Route = createFileRoute('/_authed/iam/permissions')({
  component: PermissionsPage,
})
