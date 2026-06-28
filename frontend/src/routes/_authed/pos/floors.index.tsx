import { createFileRoute } from '@tanstack/react-router'

import { FloorsPage } from '@/modules/pos/pages/floors-page'

export const Route = createFileRoute('/_authed/pos/floors/')({
  component: FloorsPage,
})
