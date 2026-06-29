import { createFileRoute } from '@tanstack/react-router'
import { ReportsPermissions } from '@turbohesap/shared'

import { api } from '@/lib/api'
import { AnalyticsModulePage } from '@/modules/genel/pages/analytics-module-page'

export const Route = createFileRoute('/_authed/genel/analytics/')({
  component: OverviewAnalyticsPage,
})

function OverviewAnalyticsPage() {
  return (
    <AnalyticsModulePage
      module="overview"
      title="Genel Özet"
      description="Tüm modüllerin birleşik performans göstergeleri."
      permission={ReportsPermissions.overview}
      fetcher={(q) => api.reports.overview(q)}
    />
  )
}
