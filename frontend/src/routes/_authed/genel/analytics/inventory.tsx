import { createFileRoute } from '@tanstack/react-router'
import { ReportsPermissions } from '@turbohesap/shared'

import { api } from '@/lib/api'
import { AnalyticsModulePage } from '@/modules/genel/pages/analytics-module-page'

export const Route = createFileRoute('/_authed/genel/analytics/inventory')({
  component: InventoryAnalyticsPage,
})

function InventoryAnalyticsPage() {
  return (
    <AnalyticsModulePage
      module="inventory"
      title="Stok Analizi"
      description="Stok hareketleri, değer ve ürün metrikleri."
      permission={ReportsPermissions.inventory}
      fetcher={(q) => api.reports.inventory(q)}
    />
  )
}
