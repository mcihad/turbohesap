import type { PosOrderType, PosPaymentMethod } from '@turbohesap/shared'

export function formatMoney(value: number | null | undefined, currency = 'TRY'): string {
  if (value == null) return '—'
  try {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency }).format(value)
  } catch {
    return `${value} ${currency}`
  }
}

export const PAYMENT_METHOD_LABELS: Record<PosPaymentMethod, string> = {
  cash: 'Nakit',
  card: 'Kart',
  account: 'Cari',
  other: 'Diğer',
}

export const ORDER_TYPE_LABELS: Record<PosOrderType, string> = {
  dine_in: 'Masa',
  takeaway: 'Paket',
  delivery: 'Teslimat',
}
