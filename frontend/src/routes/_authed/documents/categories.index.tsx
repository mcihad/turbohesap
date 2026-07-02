import { createFileRoute } from '@tanstack/react-router'

import { CategoriesPage } from '@/modules/documents/pages/categories-page'

export const Route = createFileRoute('/_authed/documents/categories/')({
  component: CategoriesPage,
})
