import { createFileRoute } from '@tanstack/react-router'

import { PosHomePage } from '@/modules/pos/pages/pos-home-page'

export const Route = createFileRoute('/_pos/pos/')({
  component: PosHomePage,
})
