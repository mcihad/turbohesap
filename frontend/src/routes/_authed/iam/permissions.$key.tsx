import { createFileRoute } from '@tanstack/react-router'

import { PermissionDetailPage } from '@/modules/iam/pages/permission-detail-page'

export const Route = createFileRoute('/_authed/iam/permissions/$key')({
  component: PermissionDetailPage,
})
