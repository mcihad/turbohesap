import { createFileRoute } from '@tanstack/react-router'
import { ReportsPermissions } from '@turbohesap/shared'

import { api } from '@/lib/api'
import { AnalyticsModulePage } from '@/modules/genel/pages/analytics-module-page'

export const Route = createFileRoute('/_authed/genel/analytics/contacts')({
  component: ContactsAnalyticsPage,
})

function ContactsAnalyticsPage() {
  return (
    <AnalyticsModulePage
      module="contacts"
      title="Cari Analizi"
      description="Müşteri/tedarikçi bakiyeleri ve etkileşim metrikleri."
      permission={ReportsPermissions.contacts}
      fetcher={(q) => api.reports.contacts(q)}
    />
  )
}
