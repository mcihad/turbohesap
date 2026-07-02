import { createFileRoute } from '@tanstack/react-router'

import { WorkCentersPage } from '@/modules/production/pages/work-centers-page'

export const Route = createFileRoute('/_authed/production/work-centers')({
  component: WorkCentersPage,
})
