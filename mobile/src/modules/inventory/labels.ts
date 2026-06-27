import type { CategoryFieldType, ProductType } from '@turbohesap/shared'

// Turkish labels for product types.
export const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
  stockable: 'Stoklu ürün',
  service: 'Hizmet',
  consumable: 'Sarf malzeme',
}

export function productTypeLabel(t: ProductType): string {
  return PRODUCT_TYPE_LABELS[t] ?? t
}

/** "1.250 ₺" style; em-dash for null. */
export function money(value: number | null | undefined, currency = 'TRY'): string {
  if (value == null) return '—'
  return `${value.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} ${currency}`
}

// Turkish labels for category custom-field types (UI only).
export const FIELD_TYPE_LABELS: Record<CategoryFieldType, string> = {
  text: 'Metin',
  textarea: 'Uzun metin',
  number: 'Sayı',
  money: 'Para',
  boolean: 'Onay kutusu',
  select: 'Liste (sabit)',
  multiselect: 'Çoklu liste',
  date: 'Tarih',
  daterange: 'Tarih aralığı',
  lookup: 'Liste (tanım listesinden)',
}

export function fieldTypeLabel(type: CategoryFieldType): string {
  return FIELD_TYPE_LABELS[type] ?? type
}

/** Build a depth-ordered flat list of categories for an indented tree view. */
export function flattenCategories<
  T extends { id: string; parentId: string | null; name: string; sortOrder: number },
>(cats: T[]): Array<{ cat: T; depth: number }> {
  const byParent = new Map<string | null, T[]>()
  for (const c of cats) {
    const arr = byParent.get(c.parentId) ?? []
    arr.push(c)
    byParent.set(c.parentId, arr)
  }
  const out: Array<{ cat: T; depth: number }> = []
  const walk = (parentId: string | null, depth: number) => {
    for (const c of (byParent.get(parentId) ?? []).sort(
      (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
    )) {
      out.push({ cat: c, depth })
      walk(c.id, depth + 1)
    }
  }
  walk(null, 0)
  return out
}
