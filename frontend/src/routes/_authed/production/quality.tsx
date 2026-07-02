import { createFileRoute } from '@tanstack/react-router'

import { QualityPage } from '@/modules/production/pages/quality-page'

export const Route = createFileRoute('/_authed/production/quality')({
  component: QualityPage,
})
