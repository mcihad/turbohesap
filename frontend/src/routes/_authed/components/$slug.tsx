import { createFileRoute } from '@tanstack/react-router'

import { ShowcasePage } from '@/modules/components/pages/showcase-page'

export const Route = createFileRoute('/_authed/components/$slug')({
  component: ShowcasePage,
})
