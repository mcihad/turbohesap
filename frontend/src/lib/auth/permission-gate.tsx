import * as React from 'react'
import { ShieldX } from 'lucide-react'

import { PageHeader, PageWrapper } from '@/components/layout/page'
import { useAuth } from './auth-context'

interface PermissionCondition {
  /** Require this single permission. */
  permission?: string
  /** Require AT LEAST ONE of these permissions. */
  anyOf?: string[]
  /** Require ALL of these permissions. */
  allOf?: string[]
}

/** Evaluate a permission condition against the current user. */
function usePermitted(cond: PermissionCondition): boolean {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = useAuth()
  if (cond.permission && !hasPermission(cond.permission)) return false
  if (cond.anyOf && cond.anyOf.length > 0 && !hasAnyPermission(cond.anyOf))
    return false
  if (cond.allOf && cond.allOf.length > 0 && !hasAllPermissions(cond.allOf))
    return false
  return true
}

/**
 * Declarative permission gate for inline UI (buttons, menu items, columns).
 * Renders `children` only when the user satisfies the condition; otherwise
 * `fallback` (default: nothing). For roles use `<RolesRequired>`; for imperative
 * checks use `useAuth().hasPermission(...)`.
 *
 *   <Can permission="iam.users.write"><Button>Yeni</Button></Can>
 */
export function Can({
  fallback = null,
  children,
  ...cond
}: PermissionCondition & {
  fallback?: React.ReactNode
  children: React.ReactNode
}) {
  return <>{usePermitted(cond) ? children : fallback}</>
}

/**
 * Page-level guard. Wraps a page's content and shows a friendly "Yetkiniz yok"
 * state when the user lacks the required permission(s) — use it so deep-linking
 * to a page you can't access shows a clear message instead of failing requests.
 */
export function PermissionRequired({
  children,
  ...cond
}: PermissionCondition & { children: React.ReactNode }) {
  return usePermitted(cond) ? <>{children}</> : <ForbiddenState />
}

/** Full-page "no permission" state. */
export function ForbiddenState() {
  return (
    <PageWrapper>
      <PageHeader
        title="Yetkiniz yok"
        description="Bu sayfayı görüntüleme izniniz bulunmuyor."
      />
      <div className="flex flex-col items-center gap-3 py-20 text-center text-muted-foreground">
        <ShieldX className="size-10" />
        <p className="max-w-sm text-sm">
          Gerekli izne sahip değilsiniz. Erişim için yöneticinizle iletişime
          geçin.
        </p>
      </div>
    </PageWrapper>
  )
}
