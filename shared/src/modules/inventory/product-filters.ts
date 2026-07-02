// Framework-agnostic product search/filter logic — shared by the web and mobile
// product lists. All filtering is client-side over the already-loaded product
// list (e-commerce style faceted search): free-text (name/description/barcodes),
// category tree (with cascade + descendants), price range, barcode, stock status,
// sales channel, active, and dynamic category-attribute facets.

import type { CategoryDto, CategoryFieldDef, CategoryFieldType } from './category.dto'
import { effectiveFieldDefs } from './category.helpers'
import type { ProductDto, ProductType } from './product.dto'

// One attribute's filter. Which fields apply depends on the field's type:
//  text/textarea → `text`; number/money → `min`/`max`;
//  select/lookup/multiselect → `values`; boolean → `bool`.
export interface AttrFilter {
  text?: string
  min?: number
  max?: number
  values?: string[]
  bool?: boolean
}

export type StockStatus = 'in' | 'out' | 'low'

export interface ProductFilters {
  /** Free text matched against name, description, code, brand and all barcodes. */
  search: string
  /** Selected category ids (cascade keeps descendants selected too). */
  categoryIds: string[]
  priceMin?: number
  priceMax?: number
  /** Purchase (cost) price range. */
  purchaseMin?: number
  purchaseMax?: number
  /** Exact/contains match against any of the product's barcodes. */
  barcode?: string
  /** in stock / out of stock / low stock. */
  stockStatus?: StockStatus
  /** Product must have a price on at least one of these channels. */
  channelIds?: string[]
  /** Product type (stockable / service / consumable). */
  types?: ProductType[]
  brands?: string[]
  /** Base unit (`birim` lookup key). */
  units?: string[]
  currencies?: string[]
  /** Whether the product is a variant template (undefined = any). */
  hasVariants?: boolean
  /** Capability flags (undefined = any). See `ProductDto` for the role model. */
  canBeSold?: boolean
  canBePurchased?: boolean
  canBeManufactured?: boolean
  weightMin?: number
  weightMax?: number
  activeOnly: boolean
  /** Per-attribute filters, keyed by CategoryFieldDef.key. */
  attrs: Record<string, AttrFilter>
}

export const EMPTY_PRODUCT_FILTERS: ProductFilters = {
  search: '',
  categoryIds: [],
  activeOnly: false,
  attrs: {},
}

// Field types that can be filtered (date/daterange are intentionally excluded).
const FILTERABLE_TYPES: ReadonlySet<CategoryFieldType> = new Set([
  'text',
  'textarea',
  'number',
  'money',
  'select',
  'multiselect',
  'boolean',
  'lookup',
])

function isSetType(type: CategoryFieldType): boolean {
  return type === 'select' || type === 'multiselect' || type === 'lookup'
}

// ── Category tree helpers ────────────────────────────────────────────────────

// Every selected category plus all of its descendants (inclusive).
export function expandCategoryIds(roots: string[], categories: CategoryDto[]): Set<string> {
  const children = new Map<string | null, CategoryDto[]>()
  for (const c of categories) {
    const arr = children.get(c.parentId) ?? []
    arr.push(c)
    children.set(c.parentId, arr)
  }
  const out = new Set<string>()
  const walk = (id: string) => {
    if (out.has(id)) return
    out.add(id)
    for (const child of children.get(id) ?? []) walk(child.id)
  }
  for (const r of roots) walk(r)
  return out
}

export type CategoryCheckState = 'checked' | 'indeterminate' | 'none'

/** Tri-state of a category node given the selected set (self + descendants). */
export function categoryCheckState(
  id: string,
  selected: string[],
  categories: CategoryDto[],
): CategoryCheckState {
  if (selected.includes(id)) return 'checked'
  const group = expandCategoryIds([id], categories)
  for (const d of group) if (d !== id && selected.includes(d)) return 'indeterminate'
  return 'none'
}

/** Toggle a node with cascade: fully checked → clear self+descendants;
 *  otherwise (none/indeterminate) → select self+descendants. */
export function toggleCategoryCascade(
  selected: string[],
  id: string,
  categories: CategoryDto[],
): string[] {
  const group = expandCategoryIds([id], categories)
  const set = new Set(selected)
  if (categoryCheckState(id, selected, categories) === 'checked') {
    for (const d of group) set.delete(d)
  } else {
    for (const d of group) set.add(d)
  }
  return [...set]
}

// The filterable custom fields for the selected categories — the union of each
// category's effective (own + inherited) field defs, de-duped by key.
export function filterableFields(
  categoryIds: string[],
  categories: CategoryDto[],
): CategoryFieldDef[] {
  const map = new Map<string, CategoryFieldDef>()
  for (const id of categoryIds) {
    for (const def of effectiveFieldDefs(id, categories)) {
      if (FILTERABLE_TYPES.has(def.type)) map.set(def.key, def)
    }
  }
  return [...map.values()].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
}

// Distinct option values present in `products` for each set-type field — the
// available facet values (so the UI offers only values that exist).
export function attrFacets(
  products: ProductDto[],
  fields: CategoryFieldDef[],
): Record<string, string[]> {
  const res: Record<string, string[]> = {}
  for (const f of fields) {
    if (!isSetType(f.type)) continue
    const set = new Set<string>()
    for (const p of products) {
      const v = p.attributes?.[f.key]
      if (Array.isArray(v)) v.forEach((x) => x != null && x !== '' && set.add(String(x)))
      else if (v != null && v !== '') set.add(String(v))
    }
    res[f.key] = [...set].sort((a, b) => a.localeCompare(b, 'tr'))
  }
  return res
}

export function matchesSearch(p: ProductDto, search: string): boolean {
  const words = search.trim().toLowerCase().split(/\s+/).filter(Boolean)
  if (words.length === 0) return true
  const hay = [p.name, p.description, p.code, p.brand, ...(p.barcodes ?? [])]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return words.every((w) => hay.includes(w))
}

function matchesStock(p: ProductDto, status: StockStatus): boolean {
  switch (status) {
    case 'in':
      return p.totalStock > 0
    case 'out':
      return p.trackStock && p.totalStock <= 0
    case 'low':
      return p.trackStock && p.totalStock > 0 && p.totalStock <= p.minQuantity
  }
}

function matchesAttr(value: unknown, def: CategoryFieldDef, f: AttrFilter): boolean {
  switch (def.type) {
    case 'text':
    case 'textarea':
      if (!f.text) return true
      return value != null && String(value).toLowerCase().includes(f.text.toLowerCase())
    case 'number':
    case 'money': {
      if (f.min == null && f.max == null) return true
      const n = Number(value)
      if (value == null || value === '' || !Number.isFinite(n)) return false
      if (f.min != null && n < f.min) return false
      if (f.max != null && n > f.max) return false
      return true
    }
    case 'boolean':
      if (f.bool == null) return true
      return Boolean(value) === f.bool
    case 'select':
    case 'lookup':
    case 'multiselect': {
      if (!f.values || f.values.length === 0) return true
      const vals = Array.isArray(value)
        ? value.map((x) => String(x))
        : value != null && value !== ''
          ? [String(value)]
          : []
      return f.values.some((sel) => vals.includes(sel))
    }
    default:
      return true
  }
}

export function filterProducts(
  products: ProductDto[],
  filters: ProductFilters,
  categories: CategoryDto[],
): ProductDto[] {
  const catSet = filters.categoryIds.length
    ? expandCategoryIds(filters.categoryIds, categories)
    : null
  const fieldByKey = new Map(filterableFields(filters.categoryIds, categories).map((f) => [f.key, f]))
  const barcodeQ = filters.barcode?.trim().toLowerCase()
  const channelSet = filters.channelIds?.length ? new Set(filters.channelIds) : null

  return products.filter((p) => {
    if (!matchesSearch(p, filters.search)) return false
    if (catSet && !(p.categoryId && catSet.has(p.categoryId))) return false
    if (filters.activeOnly && !p.isActive) return false
    if (filters.stockStatus && !matchesStock(p, filters.stockStatus)) return false
    if (barcodeQ && !(p.barcodes ?? []).some((b) => b.toLowerCase().includes(barcodeQ))) return false
    if (channelSet && !(p.channelIds ?? []).some((c) => channelSet.has(c))) return false
    if (filters.types?.length && !filters.types.includes(p.type)) return false
    if (filters.brands?.length && !(p.brand && filters.brands.includes(p.brand))) return false
    if (filters.units?.length && !(p.unit && filters.units.includes(p.unit))) return false
    if (filters.currencies?.length && !filters.currencies.includes(p.currency)) return false
    if (filters.hasVariants != null && p.hasVariants !== filters.hasVariants) return false
    if (filters.canBeSold != null && p.canBeSold !== filters.canBeSold) return false
    if (filters.canBePurchased != null && p.canBePurchased !== filters.canBePurchased) return false
    if (filters.canBeManufactured != null && p.canBeManufactured !== filters.canBeManufactured) return false
    if (filters.priceMin != null || filters.priceMax != null) {
      if (p.salePrice == null) return false
      if (filters.priceMin != null && p.salePrice < filters.priceMin) return false
      if (filters.priceMax != null && p.salePrice > filters.priceMax) return false
    }
    if (filters.purchaseMin != null || filters.purchaseMax != null) {
      if (p.purchasePrice == null) return false
      if (filters.purchaseMin != null && p.purchasePrice < filters.purchaseMin) return false
      if (filters.purchaseMax != null && p.purchasePrice > filters.purchaseMax) return false
    }
    if (filters.weightMin != null || filters.weightMax != null) {
      if (p.weight == null) return false
      if (filters.weightMin != null && p.weight < filters.weightMin) return false
      if (filters.weightMax != null && p.weight > filters.weightMax) return false
    }
    for (const key of Object.keys(filters.attrs)) {
      const def = fieldByKey.get(key)
      if (!def) continue // attribute no longer applicable to the chosen categories
      if (!matchesAttr(p.attributes?.[key], def, filters.attrs[key])) return false
    }
    return true
  })
}

function attrIsActive(f: AttrFilter): boolean {
  return Boolean(f.text || f.min != null || f.max != null || f.bool != null || (f.values && f.values.length))
}

/** Count of *advanced* filters in effect (excludes the search box). */
export function advancedFilterCount(filters: ProductFilters): number {
  let n = 0
  if (filters.categoryIds.length) n++
  if (filters.activeOnly) n++
  if (filters.stockStatus) n++
  if (filters.barcode?.trim()) n++
  if (filters.channelIds?.length) n++
  if (filters.types?.length) n++
  if (filters.brands?.length) n++
  if (filters.units?.length) n++
  if (filters.currencies?.length) n++
  if (filters.hasVariants != null) n++
  if (filters.canBeSold != null) n++
  if (filters.canBePurchased != null) n++
  if (filters.canBeManufactured != null) n++
  if (filters.priceMin != null || filters.priceMax != null) n++
  if (filters.purchaseMin != null || filters.purchaseMax != null) n++
  if (filters.weightMin != null || filters.weightMax != null) n++
  for (const k of Object.keys(filters.attrs)) if (attrIsActive(filters.attrs[k])) n++
  return n
}

/** Sorted distinct non-empty string values across products for a field. */
export function distinctValues(
  products: ProductDto[],
  selector: (p: ProductDto) => string | null | undefined,
): string[] {
  const set = new Set<string>()
  for (const p of products) {
    const v = selector(p)
    if (v != null && v !== '') set.add(String(v))
  }
  return [...set].sort((a, b) => a.localeCompare(b, 'tr'))
}
