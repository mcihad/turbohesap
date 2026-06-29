import { createFileRoute } from '@tanstack/react-router'
import { ReportsPermissions } from '@turbohesap/shared'

import { api } from '@/lib/api'
import { AnalyticsModulePage } from '@/modules/genel/pages/analytics-module-page'

export const Route = createFileRoute('/_authed/genel/analytics/sales')({
  component: SalesAnalyticsPage,
})

function SalesAnalyticsPage() {
  return (
    <AnalyticsModulePage
      module="sales"
      title="Satış Analizi"
      description="Satış kanalları, sipariş ve ciro metrikleri."
      permission={ReportsPermissions.sales}
      fetcher={(q) => api.reports.sales(q)}
    />
  )
}
