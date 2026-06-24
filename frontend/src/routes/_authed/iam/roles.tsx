import { createFileRoute } from '@tanstack/react-router'

import { RolesPage } from '@/modules/iam/pages/roles-page'

export const Route = createFileRoute('/_authed/iam/roles')({
  component: RolesPage,
})
