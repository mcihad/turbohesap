// Üretim modülü biçimlendiricileri — Türkçe yerel ayar.

/** Para birimi (TRY varsayılan). */
export function formatMoney(value: number | null | undefined, currency = 'TRY'): string {
  const v = value ?? 0
  try {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency }).format(v)
  } catch {
    return `${v} ${currency}`
  }
}

/** Miktar — 3 ondalığa kadar, gereksiz sıfır yok. */
export function formatQty(value: number | null | undefined): string {
  if (value == null) return '—'
  try {
    return new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 3 }).format(value)
  } catch {
    return String(value)
  }
}

/** Dakikayı "2 sa 30 dk" biçimine çevirir. */
export function formatMinutes(mins: number | null | undefined): string {
  if (mins == null) return '—'
  const m = Math.round(mins)
  if (m <= 0) return '0 dk'
  if (m < 60) return `${m} dk`
  const h = Math.floor(m / 60)
  const rem = m % 60
  return rem === 0 ? `${h} sa` : `${h} sa ${rem} dk`
}
