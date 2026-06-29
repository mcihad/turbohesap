// Shared formatting helpers for the Sipariş (order document) screens — money
// formatting plus the Turkish label/tone maps for order kind, direction and
// status, so every order screen stays consistent. Mirrors invoices/format.ts.

import type { BadgeTone } from '../../components'
import {
  ORDER_DIRECTION_LABELS,
  ORDER_KIND_LABELS,
  ORDER_STATUS_LABELS,
  type OrderKind,
  type OrderStatus,
} from '@turbohesap/shared'

export function formatMoney(value: number, currency = 'TRY'): string {
  try {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency }).format(value)
  } catch {
    return `${value} ${currency}`
  }
}

/** Plural tab/list titles for each order kind. */
export const KIND_PLURAL_LABELS: Record<OrderKind, string> = {
  quote: 'Teklifler',
  order: 'Siparişler',
  delivery: 'İrsaliyeler',
}

/** Feather icon per kind. */
export const KIND_ICONS: Record<OrderKind, 'file-text' | 'clipboard' | 'truck'> = {
  quote: 'file-text',
  order: 'clipboard',
  delivery: 'truck',
}

export const STATUS_TONES: Record<OrderStatus, BadgeTone> = {
  draft: 'muted',
  confirmed: 'primary',
  shipped: 'success',
  invoiced: 'success',
  cancelled: 'destructive',
}

export { ORDER_DIRECTION_LABELS, ORDER_KIND_LABELS, ORDER_STATUS_LABELS }
