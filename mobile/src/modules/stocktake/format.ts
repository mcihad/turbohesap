// Shared formatting helpers for the Sayım (stocktake) screens — Turkish label/
// tone maps for count status + kind, plus a compact quantity formatter. Mirrors
// orders/format.ts so every stocktake screen stays visually consistent.

import type { BadgeTone } from '../../components'
import type { IconName } from '../../components'
import {
  type StockCountKind,
  type StockCountStatus,
} from '@turbohesap/shared'

/** Status → badge tone, matching the lifecycle (taslak→sayımda→incelemede→işlendi). */
export const STATUS_TONES: Record<StockCountStatus, BadgeTone> = {
  draft: 'muted',
  counting: 'primary',
  review: 'warning',
  approved: 'success',
  cancelled: 'destructive',
}

/** Feather icon per count kind. */
export const KIND_ICONS: Record<StockCountKind, IconName> = {
  full: 'maximize',
  partial: 'grid',
  cycle: 'repeat',
}

/** Trim a quantity to a tidy string (drops trailing zeros: 3.0 → "3", 2.50 → "2.5"). */
export function formatQty(value: number): string {
  if (!Number.isFinite(value)) return '0'
  const rounded = Math.round(value * 1000) / 1000
  return Number.isInteger(rounded) ? String(rounded) : String(rounded).replace('.', ',')
}

/** Signed difference, e.g. "+3", "-2", "0". */
export function formatDiff(value: number): string {
  if (value > 0) return `+${formatQty(value)}`
  return formatQty(value)
}

/** Tone for a variance value (over = info/success, short = destructive). */
export function diffTone(value: number): BadgeTone {
  if (value > 0) return 'info'
  if (value < 0) return 'destructive'
  return 'muted'
}
