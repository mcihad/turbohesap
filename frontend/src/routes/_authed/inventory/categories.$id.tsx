import { createFileRoute } from '@tanstack/react-router'

import { CategoryDetailPage } from '@/modules/inventory/pages/category-detail-page'

export const Route = createFileRoute('/_authed/inventory/categories/$id')({
  component: CategoryDetailPage,
})
