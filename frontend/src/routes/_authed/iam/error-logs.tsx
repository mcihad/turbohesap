import { createFileRoute } from '@tanstack/react-router'

import { ErrorLogsPage } from '@/modules/iam/pages/error-logs-page'

export const Route = createFileRoute('/_authed/iam/error-logs')({
  component: ErrorLogsPage,
})
