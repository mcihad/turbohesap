import { createFileRoute } from '@tanstack/react-router'

import { StocktakeListPage } from '@/modules/stocktake/pages/stocktake-list-page'

export const Route = createFileRoute('/_authed/stocktake/counts')({
  component: StocktakeListPage,
})
