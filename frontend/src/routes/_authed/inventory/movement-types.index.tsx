import { createFileRoute } from '@tanstack/react-router'

import { MovementTypesPage } from '@/modules/inventory/pages/movement-types-page'

export const Route = createFileRoute('/_authed/inventory/movement-types/')({
  component: MovementTypesPage,
})
