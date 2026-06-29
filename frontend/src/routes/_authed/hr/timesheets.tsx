import { createFileRoute } from '@tanstack/react-router'

import { TimesheetsPage } from '@/modules/hr/pages/timesheets-page'

export const Route = createFileRoute('/_authed/hr/timesheets')({
  component: TimesheetsPage,
})
