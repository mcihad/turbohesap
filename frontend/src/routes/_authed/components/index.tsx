import { createFileRoute } from '@tanstack/react-router'

import { ComponentsIndexPage } from '@/modules/components/pages/index-page'

export const Route = createFileRoute('/_authed/components/')({
  component: ComponentsIndexPage,
})
