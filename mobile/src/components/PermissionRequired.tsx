// PermissionRequired — page-level guard (the RN counterpart of the web
// `<PermissionRequired>`, DESIGN.md / AGENTS.md §7). Shows a friendly "Yetkiniz
// yok" screen when the user lacks the required permission, so a deep link to a
// screen they can't access fails gracefully. UX only — the backend re-checks.

import * as React from 'react'

import { type PermissionCondition, usePermitted } from '../lib/auth/can'
import { EmptyState } from './EmptyState'
import { Screen } from './Screen'

export function PermissionRequired({
  title,
  onBack,
  children,
  ...cond
}: PermissionCondition & {
  title: string
  onBack?: () => void
  children: React.ReactNode
}) {
  const permitted = usePermitted(cond)
  if (permitted) return <>{children}</>
  return (
    <Screen header={{ title, onBack }}>
      <EmptyState
        icon="shield-off"
        title="Yetkiniz yok"
        description="Bu sayfayı görüntüleme izniniz bulunmuyor. Erişim için yöneticinizle iletişime geçin."
      />
    </Screen>
  )
}
