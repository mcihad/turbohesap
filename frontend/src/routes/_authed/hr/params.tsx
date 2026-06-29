import { createFileRoute } from '@tanstack/react-router'

import { ParamsPage } from '@/modules/hr/pages/params-page'

export const Route = createFileRoute('/_authed/hr/params')({
  component: ParamsPage,
})
