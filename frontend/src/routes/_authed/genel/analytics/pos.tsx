import { createFileRoute } from '@tanstack/react-router'
import { ReportsPermissions } from '@turbohesap/shared'

import { api } from '@/lib/api'
import { AnalyticsModulePage } from '@/modules/genel/pages/analytics-module-page'

export const Route = createFileRoute('/_authed/genel/analytics/pos')({
  component: PosAnalyticsPage,
})

function PosAnalyticsPage() {
  return (
    <AnalyticsModulePage
      module="pos"
      title="POS Analizi"
      description="Satış noktası performansı ve sipariş metrikleri."
      permission={ReportsPermissions.pos}
      fetcher={(q) => api.reports.pos(q)}
    />
  )
}
