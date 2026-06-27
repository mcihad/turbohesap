import { createFileRoute } from '@tanstack/react-router'

import { BranchesPage } from '@/modules/org/pages/branches-page'

export const Route = createFileRoute('/_authed/org/branches/')({
  component: BranchesPage,
})
