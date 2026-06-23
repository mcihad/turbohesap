import * as React from 'react'

import { useAuth } from './auth-context'

interface RolesRequiredProps {
  /** Allow when the user has AT LEAST ONE of these roles. */
  anyOf?: string[]
  /** Allow when the user has ALL of these roles. */
  allOf?: string[]
  /** Rendered when the user is not allowed (default: render nothing). */
  fallback?: React.ReactNode
  children: React.ReactNode
}

/**
 * Declarative role gate. Renders `children` only when the current user's roles
 * satisfy the conditions; otherwise renders `fallback`. Mirrors the backend
 * `RolesRequired` middleware (realm + this module's client roles).
 *
 *   <RolesRequired anyOf={['Manager', 'Admin']}>
 *     <Button>Raporu sil</Button>
 *   </RolesRequired>
 *
 * Conditions combine with AND. With neither `anyOf` nor `allOf`, children always
 * render (use it purely to read auth context elsewhere). For imperative checks
 * use `useAuth().hasAnyRole(...)` / `hasAllRoles(...)`.
 */
export function RolesRequired({
  anyOf,
  allOf,
  fallback = null,
  children,
}: RolesRequiredProps) {
  const { hasAnyRole, hasAllRoles } = useAuth()

  const okAny = anyOf && anyOf.length > 0 ? hasAnyRole(anyOf) : true
  const okAll = allOf && allOf.length > 0 ? hasAllRoles(allOf) : true
  const allowed = okAny && okAll

  return <>{allowed ? children : fallback}</>
}
