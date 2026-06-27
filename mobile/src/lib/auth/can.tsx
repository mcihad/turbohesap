// Declarative permission gate — the RN counterpart of the web `<Can>`
// (`frontend/src/lib/auth/permission-gate.tsx`). Renders `children` only when the
// current user satisfies the condition; otherwise `fallback` (default nothing).
// Uses the SAME permission keys (@turbohesap/shared) as the backend's
// @RequirePermissions — this is UX only; the server is the real boundary.

import * as React from 'react'

import { useAuth } from './auth-context'

export interface PermissionCondition {
  /** Require this single permission. */
  permission?: string
  /** Require AT LEAST ONE of these permissions. */
  anyOf?: string[]
  /** Require ALL of these permissions. */
  allOf?: string[]
}

export function usePermitted(cond: PermissionCondition): boolean {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = useAuth()
  if (cond.permission && !hasPermission(cond.permission)) return false
  if (cond.anyOf && cond.anyOf.length > 0 && !hasAnyPermission(cond.anyOf)) return false
  if (cond.allOf && cond.allOf.length > 0 && !hasAllPermissions(cond.allOf)) return false
  return true
}

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
