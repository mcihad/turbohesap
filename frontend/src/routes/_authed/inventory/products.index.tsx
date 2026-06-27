import { createFileRoute } from '@tanstack/react-router'

import { ProductsPage } from '@/modules/inventory/pages/products-page'

export const Route = createFileRoute('/_authed/inventory/products/')({
  component: ProductsPage,
})
