import { createFileRoute } from '@tanstack/react-router'

import { CategoriesPage } from '@/modules/inventory/pages/categories-page'

export const Route = createFileRoute('/_authed/inventory/categories/')({
  component: CategoriesPage,
})
