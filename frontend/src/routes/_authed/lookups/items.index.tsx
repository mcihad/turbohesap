import { createFileRoute } from '@tanstack/react-router'

import { LookupsPage } from '@/modules/lookups/pages/lookups-page'

export const Route = createFileRoute('/_authed/lookups/items/')({
  component: LookupsPage,
})
