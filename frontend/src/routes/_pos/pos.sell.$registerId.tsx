import { createFileRoute } from '@tanstack/react-router'

import { PosSellPage } from '@/modules/pos/pages/pos-sell-page'

export const Route = createFileRoute('/_pos/pos/sell/$registerId')({
  component: PosSellPage,
})
