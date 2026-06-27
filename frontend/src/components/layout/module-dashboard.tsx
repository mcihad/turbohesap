// ModuleDashboard — the thin shell for a module's "Gösterge Paneli". No title and
// no hero (the page already has none) and no bottom quick-links: dashboards are
// just stats → charts → recent, supplied as children. Dashboards are exempt from
// DESIGN.md; only dark/light + mobile-first apply.

import { PageWrapper } from '@/components/layout/page'
import type { AppModule } from '@/modules/types'

export function ModuleDashboard({
  children,
}: {
  /** Kept for call-site clarity; the dashboard body is fully self-contained. */
  module?: AppModule
  children?: React.ReactNode
}) {
  return (
    <PageWrapper>
      <div className="space-y-4">{children}</div>
    </PageWrapper>
  )
}
