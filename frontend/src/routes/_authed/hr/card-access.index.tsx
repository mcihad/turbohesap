import { createFileRoute } from '@tanstack/react-router'

import { CardAccessPage } from '@/modules/hr/pages/card-access-page'

export const Route = createFileRoute('/_authed/hr/card-access/')({
  component: CardAccessPage,
})
