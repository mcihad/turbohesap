import { createFileRoute } from '@tanstack/react-router'

import { ModifiersPage } from '@/modules/pos/pages/modifiers-page'

export const Route = createFileRoute('/_authed/pos/modifiers/')({
  component: ModifiersPage,
})
