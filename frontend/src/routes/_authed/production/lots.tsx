import { createFileRoute } from '@tanstack/react-router'

import { LotsPage } from '@/modules/production/pages/lots-page'

export const Route = createFileRoute('/_authed/production/lots')({
  component: LotsPage,
})
