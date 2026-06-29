// Formatters for the İK & Bordro (HR) module — Turkish locale.

/** Currency, defaulting to TRY (salaries are always TL in this module). */
export function formatMoney(value: number, currency: string = 'TRY'): string {
  try {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency }).format(value)
  } catch {
    return `${value} ${currency}`
  }
}

/** A fraction (0.14) as a percentage string ("%14"). */
export function formatRate(fraction: number): string {
  return `%${new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 4 }).format(fraction * 100)}`
}

export const MONTH_LABELS = [
  'Ocak',
  'Şubat',
  'Mart',
  'Nisan',
  'Mayıs',
  'Haziran',
  'Temmuz',
  'Ağustos',
  'Eylül',
  'Ekim',
  'Kasım',
  'Aralık',
] as const

export function monthLabel(month: number): string {
  return MONTH_LABELS[month - 1] ?? String(month)
}

export function periodLabel(year: number, month: number): string {
  return `${monthLabel(month)} ${year}`
}
