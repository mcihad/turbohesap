import { createFileRoute } from '@tanstack/react-router'
import { ReportsPermissions } from '@turbohesap/shared'

import { api } from '@/lib/api'
import { AnalyticsModulePage } from '@/modules/genel/pages/analytics-module-page'

export const Route = createFileRoute('/_authed/genel/analytics/invoices')({
  component: InvoicesAnalyticsPage,
})

function InvoicesAnalyticsPage() {
  return (
    <AnalyticsModulePage
      module="invoices"
      title="Fatura Analizi"
      description="Faturalama hacmi, KDV ve tahsilat metrikleri."
      permission={ReportsPermissions.invoices}
      fetcher={(q) => api.reports.invoices(q)}
    />
  )
}
