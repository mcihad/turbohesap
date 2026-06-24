import { useQuery } from '@tanstack/react-query'

import { IamPermissions } from '@turbohesap/shared'

import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth/auth-context'
import { AuditTrail } from '@/components/ui/audit-trail'

/**
 * EntityAuditTrail — drops the audit history of one entity onto a detail page.
 * Fetches /iam/audit-logs/entity/:type/:id and renders the shared AuditTrail.
 * Renders nothing if the user lacks `iam.audit.read`.
 *
 *   <EntityAuditTrail entityType="User" entityId={user.id} />
 */
export function EntityAuditTrail({
  entityType,
  entityId,
  className,
}: {
  entityType: string
  entityId: string
  className?: string
}) {
  const { hasPermission } = useAuth()
  const canRead = hasPermission(IamPermissions.auditRead)

  const query = useQuery({
    queryKey: ['iam', 'audit-logs', 'entity', entityType, entityId],
    queryFn: () => api.iam.auditLogs.forEntity(entityType, entityId),
    enabled: canRead && Boolean(entityId),
  })

  if (!canRead) return null

  return (
    <AuditTrail
      logs={query.data ?? []}
      loading={query.isLoading}
      emptyText="Bu kayıt için denetim geçmişi yok."
      className={className}
    />
  )
}
