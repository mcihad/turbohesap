// ModuleDashboard — the thin shell for a module's "Gösterge Paneli". No title and
// no hero (the page already has none) and no bottom quick-links: dashboards are
// just stats → charts → recent, supplied as children. Dashboards are exempt from
// DESIGN.md; only dark/light + mobile-first apply.
//
// It also **gates the dashboard route**: a user with no permission tied to the
// module gets a "Yetkiniz yok" state instead (so deep-linking to /<module> can't
// bypass the hidden module rail icon). Pure overview modules (no gated items, e.g.
// `genel`) stay open to everyone.

import { PageWrapper } from '@/components/layout/page'
import { modulePermissionKeys } from '@/lib/auth/access'
import { PermissionRequired } from '@/lib/auth/permission-gate'
import type { AppModule } from '@/modules/types'

export function ModuleDashboard({
  module,
  children,
}: {
  module?: AppModule
  children?: React.ReactNode
}) {
  const body = (
    <PageWrapper>
      <div className="space-y-4">{children}</div>
    </PageWrapper>
  )

  const keys = module ? modulePermissionKeys(module) : []
  if (keys.length === 0) return body
  return <PermissionRequired anyOf={keys}>{body}</PermissionRequired>
}
