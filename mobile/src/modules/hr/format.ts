// Shared formatting helpers for the İK & Bordro (HR) screens — money formatting
// plus Turkish label/tone maps for leave + payroll status. Mirrors the role of
// orders/format.ts and invoices/format.ts.

import type { BadgeTone } from '../../components'
import {
  LEAVE_STATUS_LABELS,
  PAYROLL_RUN_STATUS_LABELS,
  type LeaveStatus,
  type PayrollRunStatus,
} from '@turbohesap/shared'

export function formatMoney(value: number, currency = 'TRY'): string {
  try {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency }).format(value)
  } catch {
    return `${value} ${currency}`
  }
}

export const MONTH_LABELS = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
]

export const LEAVE_STATUS_TONES: Record<LeaveStatus, BadgeTone> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'destructive',
}

export const PAYROLL_RUN_STATUS_TONES: Record<PayrollRunStatus, BadgeTone> = {
  draft: 'muted',
  finalized: 'primary',
  paid: 'success',
}

export { LEAVE_STATUS_LABELS, PAYROLL_RUN_STATUS_LABELS }
