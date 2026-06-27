// Product variants — concrete sellable/stockable combinations of a product's
// variant attributes (e.g. Renk=Kırmızı, Beden=M). Inspired by Odoo
// product.product / ERPNext Item Variant. Each has its own SKU, barcode and an
// optional price (or a price delta on top of the template).

export interface ProductVariantDto {
  id: string
  productId: string
  /** SKU for this variant (unique). */
  code: string
  barcode: string
  /** The chosen value per attribute name, e.g. { Renk: "Kırmızı", Beden: "M" }. */
  attributeValues: Record<string, string>
  /** Human label, e.g. "Kırmızı / M". */
  label: string
  /** Added to the template sale price when the variant has no explicit price. */
  priceExtra: number
  /** Explicit overrides; null → fall back to template (+ priceExtra). */
  salePrice: number | null
  purchasePrice: number | null
  /** Resolved unit sale price actually used (override, or template+extra). */
  effectiveSalePrice: number | null
  isActive: boolean
  imageUrl: string
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface CreateProductVariantRequest {
  attributeValues: Record<string, string>
  code?: string
  barcode?: string
  priceExtra?: number
  salePrice?: number | null
  purchasePrice?: number | null
  isActive?: boolean
  imageUrl?: string
  sortOrder?: number
}

export type UpdateProductVariantRequest = Partial<CreateProductVariantRequest>

// Generate the cartesian product of the template's variantAttributes, creating
// any missing variants. Existing ones (by attribute combination) are kept.
export interface GenerateVariantsRequest {
  /** When true, deactivate variants whose combination is no longer valid. */
  pruneInvalid?: boolean
}
