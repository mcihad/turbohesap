// A flattened "sellable/stockable unit" for the stock list. A product with
// variants contributes ONE row per variant (the parent row is hidden, because
// the thing you actually stock & sell is the variant). A variant-less product
// contributes itself. Powers the inventory stock list grid.

export interface SellableUnitDto {
  /** Stable row id: variantId when a variant, else productId. */
  id: string
  productId: string
  /** Null for a variant-less product. */
  variantId: string | null
  /** SKU/code of the unit (variant code, else product code). */
  code: string
  /** Display name, e.g. "Tişört — Kırmızı / M" or just the product name. */
  label: string
  barcode: string
  unit: string
  categoryId: string | null
  categoryName: string | null
  type: string
  brand: string
  trackStock: boolean
  salePrice: number | null
  purchasePrice: number | null
  taxRate: number | null
  currency: string
  /** On-hand for this unit (variant- or product-level). 0 when not tracked. */
  totalStock: number
  minQuantity: number
  isActive: boolean
  imageUrl: string
}
