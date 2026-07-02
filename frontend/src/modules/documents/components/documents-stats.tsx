// Evrak dashboard statistics — total, expiring soon, expired, private count.
// Counts are derived from the same list the viewer already has access to (no
// extra backend calls) — privacy is enforced server-side on that list already.

import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, FileStack, Lock, ShieldAlert } from 'lucide-react'

import { DocumentsPermissions } from '@turbohesap/shared'

import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth/auth-context'
import { StatGrid, StatTile } from '@/components/layout/stat-tile'

export function DocumentsStats() {
  const { hasPermission } = useAuth()
  const canRead = hasPermission(DocumentsPermissions.documentsRead)

  const docsQuery = useQuery({
    queryKey: ['documents', 'documents'],
    queryFn: () => api.documents.documents.list(),
    enabled: canRead,
  })

  const docs = docsQuery.data ?? []
  const expiringSoon = docs.filter((d) => d.expiryStatus === 'expiring_soon').length
  const expired = docs.filter((d) => d.expiryStatus === 'expired').length
  const privateCount = docs.filter((d) => d.isPrivate).length
  const loading = docsQuery.isLoading

  return (
    <StatGrid>
      <StatTile icon={FileStack} tone="primary" label="Evrak" value={docs.length} loading={loading} />
      <StatTile icon={AlertTriangle} tone="warning" label="Süresi yaklaşan" value={expiringSoon} hint="hatırlatma penceresinde" loading={loading} />
      <StatTile icon={ShieldAlert} tone="destructive" label="Süresi dolmuş" value={expired} loading={loading} />
      <StatTile icon={Lock} tone="info" label="Kişiye özel" value={privateCount} loading={loading} />
    </StatGrid>
  )
}
