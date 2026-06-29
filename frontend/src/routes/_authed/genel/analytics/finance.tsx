import { createFileRoute } from '@tanstack/react-router'
import { ReportsPermissions } from '@turbohesap/shared'

import { api } from '@/lib/api'
import { AnalyticsModulePage } from '@/modules/genel/pages/analytics-module-page'

export const Route = createFileRoute('/_authed/genel/analytics/finance')({
  component: FinanceAnalyticsPage,
})

function FinanceAnalyticsPage() {
  return (
    <AnalyticsModulePage
      module="finance"
      title="Finans Analizi"
      description="Gelir, gider ve nakit akışı göstergeleri."
      permission={ReportsPermissions.finance}
      fetcher={(q) => api.reports.finance(q)}
    />
  )
}
