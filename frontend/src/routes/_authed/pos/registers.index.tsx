import { createFileRoute } from '@tanstack/react-router'

import { RegistersPage } from '@/modules/pos/pages/registers-page'

export const Route = createFileRoute('/_authed/pos/registers/')({
  component: RegistersPage,
})
