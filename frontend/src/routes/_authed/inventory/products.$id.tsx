import { createFileRoute } from '@tanstack/react-router'

import { ProductDetailPage } from '@/modules/inventory/pages/product-detail-page'

export const Route = createFileRoute('/_authed/inventory/products/$id')({
  component: ProductDetailPage,
})
