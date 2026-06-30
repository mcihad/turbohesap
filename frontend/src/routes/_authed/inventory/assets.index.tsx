import { createFileRoute } from '@tanstack/react-router'

import { AssetsPage } from '@/modules/inventory/pages/assets-page'

export const Route = createFileRoute('/_authed/inventory/assets/')({
  component: AssetsPage,
})
