import type { DocumentExpiryStatus } from '@turbohesap/shared'

export const EXPIRY_STATUS_LABELS: Record<DocumentExpiryStatus, string> = {
  none: 'Süresiz',
  active: 'Aktif',
  expiring_soon: 'Yaklaşıyor',
  expired: 'Süresi doldu',
}

export function expiryStatusLabel(s: DocumentExpiryStatus): string {
  return EXPIRY_STATUS_LABELS[s] ?? s
}

// Badge tone per status — destructive (expired) / warning (expiring soon) /
// success (active) / outline+muted (none, not time-bound).
export function expiryStatusBadgeVariant(
  s: DocumentExpiryStatus,
): 'destructive' | 'warning' | 'success' | 'outline' {
  switch (s) {
    case 'expired':
      return 'destructive'
    case 'expiring_soon':
      return 'warning'
    case 'active':
      return 'success'
    default:
      return 'outline'
  }
}
