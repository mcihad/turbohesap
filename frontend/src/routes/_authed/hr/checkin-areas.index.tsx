import { createFileRoute } from '@tanstack/react-router'

import { CheckinAreasPage } from '@/modules/hr/pages/checkin-areas-page'

export const Route = createFileRoute('/_authed/hr/checkin-areas/')({
  component: CheckinAreasPage,
})
