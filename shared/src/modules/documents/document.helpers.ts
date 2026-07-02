// Pure helpers over the document contracts — shared by web + mobile (badges) and
// the backend DTO mapper, so "süreli evrak" status is computed identically
// everywhere and never drifts out of sync with a stored column.

import type { DocumentExpiryStatus } from './document.dto'

/**
 * Computes a document's time-bound status from its `expiryDate`, the same
 * "computed, never stored" philosophy as finance account balances. `today`
 * is injectable for tests; `defaultReminderDays` applies when the document
 * doesn't specify its own `reminderDaysBefore`.
 */
export function computeExpiryStatus(
  isTimeBound: boolean,
  expiryDate: string | null,
  reminderDaysBefore: number | null,
  today: Date = new Date(),
  defaultReminderDays = 30,
): DocumentExpiryStatus {
  if (!isTimeBound || !expiryDate) return 'none'
  const days = Math.floor(
    (new Date(expiryDate).getTime() - today.getTime()) / 86_400_000,
  )
  if (days < 0) return 'expired'
  if (days <= (reminderDaysBefore ?? defaultReminderDays)) return 'expiring_soon'
  return 'active'
}
