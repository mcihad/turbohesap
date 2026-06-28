// Shared formatting helpers for the Fatura (invoice) screens — money formatting
// plus the Turkish label/tone maps for invoice type and status, so every invoice
// screen stays consistent.

import type { BadgeTone } from '../../components'
import type { InvoiceStatus, InvoiceType } from '@turbohesap/shared'

export function formatMoney(value: number, currency = 'TRY'): string {
  try {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency }).format(value)
  } catch {
    return `${value} ${currency}`
  }
}

export const TYPE_LABELS: Record<InvoiceType, string> = {
  sales: 'Satış',
  purchase: 'Alış',
  return: 'İade',
}

export const STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: 'Taslak',
  issued: 'Kesildi',
  paid: 'Ödendi',
  cancelled: 'İptal',
}

export const STATUS_TONES: Record<InvoiceStatus, BadgeTone> = {
  draft: 'muted',
  issued: 'success',
  paid: 'primary',
  cancelled: 'destructive',
}
