import { createFileRoute } from '@tanstack/react-router'

import { AuditLogsPage } from '@/modules/iam/pages/audit-logs-page'

export const Route = createFileRoute('/_authed/iam/audit-logs')({
  component: AuditLogsPage,
})
