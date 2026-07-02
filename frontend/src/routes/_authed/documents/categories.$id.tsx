import { createFileRoute } from '@tanstack/react-router'

import { CategoryDetailPage } from '@/modules/documents/pages/category-detail-page'

export const Route = createFileRoute('/_authed/documents/categories/$id')({
  component: CategoryDetailPage,
})
