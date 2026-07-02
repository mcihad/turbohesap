import { createFileRoute } from '@tanstack/react-router'

import { PlanningPage } from '@/modules/production/pages/planning-page'

export const Route = createFileRoute('/_authed/production/planning')({
  component: PlanningPage,
})
