import { createFileRoute } from '@tanstack/react-router'

import { ShiftRotationsPage } from '@/modules/hr/pages/shift-rotations-page'

export const Route = createFileRoute('/_authed/hr/shift-rotations/')({
  component: ShiftRotationsPage,
})
