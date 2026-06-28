// POS display helpers (Turkish locale).

export function money(value: number | null | undefined, currency = 'TRY'): string {
  if (value == null) return '—'
  const n = value.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return `${n} ${currency === 'TRY' ? '₺' : currency}`
}

export const ORDER_TYPE_LABELS: Record<string, string> = {
  dine_in: 'Masa',
  takeaway: 'Paket',
  delivery: 'Teslimat',
}

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Nakit',
  card: 'Kart',
  account: 'Cari (Hesaba)',
  other: 'Diğer',
}

export const ORDER_STATUS_LABELS: Record<string, string> = {
  open: 'Açık',
  paid: 'Ödendi',
  voided: 'İptal',
  refunded: 'İade',
  parked: 'Beklemede',
}
