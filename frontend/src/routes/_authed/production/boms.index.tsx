import { createFileRoute } from '@tanstack/react-router'

import { BomsListPage } from '@/modules/production/pages/boms-list-page'

export const Route = createFileRoute('/_authed/production/boms/')({
  component: BomsListPage,
})
