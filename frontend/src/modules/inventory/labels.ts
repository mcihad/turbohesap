import type { ProductType } from '@turbohesap/shared'

export const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
  stockable: 'Stoklu ürün',
  service: 'Hizmet',
  consumable: 'Sarf malzeme',
}

export function productTypeLabel(t: ProductType): string {
  return PRODUCT_TYPE_LABELS[t] ?? t
}

// Compact money formatter — "1.250 ₺" style; em-dash for null.
export function money(value: number | null | undefined, currency = 'TRY'): string {
  if (value == null) return '—'
  const n = value.toLocaleString('tr-TR', { maximumFractionDigits: 2 })
  return `${n} ${currency}`
}
