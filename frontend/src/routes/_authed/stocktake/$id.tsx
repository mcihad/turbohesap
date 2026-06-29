import { createFileRoute } from '@tanstack/react-router'

import { StocktakeDetailPage } from '@/modules/stocktake/pages/stocktake-detail-page'

export const Route = createFileRoute('/_authed/stocktake/$id')({
  component: StocktakeDetailPage,
})
