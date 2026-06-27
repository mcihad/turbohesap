import { createFileRoute } from '@tanstack/react-router'

import { BranchDetailPage } from '@/modules/org/pages/branch-detail-page'

export const Route = createFileRoute('/_authed/org/branches/$id')({
  component: BranchDetailPage,
})
