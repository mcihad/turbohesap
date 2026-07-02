import type { BadgeTone } from '../../components'
import type { DocumentExpiryStatus, DocumentFieldType } from '@turbohesap/shared'

// Turkish labels + badge tones for the computed expiry status. Mirrors the
// "computed, never stored" philosophy documented on `computeExpiryStatus`.
export const EXPIRY_STATUS_LABELS: Record<DocumentExpiryStatus, string> = {
  none: 'Süresiz',
  active: 'Geçerli',
  expiring_soon: 'Süresi yaklaşıyor',
  expired: 'Süresi doldu',
}

export const EXPIRY_STATUS_TONES: Record<DocumentExpiryStatus, BadgeTone> = {
  none: 'muted',
  active: 'success',
  expiring_soon: 'warning',
  expired: 'destructive',
}

export function expiryStatusLabel(s: DocumentExpiryStatus): string {
  return EXPIRY_STATUS_LABELS[s] ?? s
}

export function expiryStatusTone(s: DocumentExpiryStatus): BadgeTone {
  return EXPIRY_STATUS_TONES[s] ?? 'muted'
}

// Turkish labels for the document category custom-field types (UI only).
export const DOCUMENT_FIELD_TYPE_LABELS: Record<DocumentFieldType, string> = {
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
      (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'tr'),
    )) {
      out.push({ cat: c, depth })
      walk(c.id, depth + 1)
    }
  }
  walk(null, 0)
  return out
}
