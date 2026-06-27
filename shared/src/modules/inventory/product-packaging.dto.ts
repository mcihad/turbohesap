// Product packagings — unit multipliers ("çarpan"): a sellable pack of N base
// units with its own barcode and price. e.g. Maden Suyu: base "Adet" (1) at 5 TL,
// pack "6'lı Koli" (qty 6) at 27 TL. Inspired by Odoo product.packaging /
// ERPNext UOM conversion + UOM-specific Item Price.

export interface ProductPackagingDto {
  id: string
  productId: string
  /** Restrict the pack to one variant, or null = applies to the whole product. */
  variantId: string | null
  /** Label of the variant this pack is pinned to, if any (e.g. "Kırmızı / M"). */
  variantLabel: string | null
  /** e.g. "6'lı Koli". */
  name: string
  /** Pack unit — a `birim` lookup key (e.g. "KOLI"). */
  unit: string
  /** How many base units this pack contains (the multiplier, e.g. 6). */
  quantity: number
  barcode: string
  /** Explicit pack price; null → quantity × base unit price. */
  salePrice: number | null
  purchasePrice: number | null
  /** Resolved pack sale price (explicit, or quantity × base unit price). */
  effectiveSalePrice: number | null
  isActive: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface CreateProductPackagingRequest {
  name: string
  quantity: number
  variantId?: string | null
  unit?: string
  barcode?: string
  salePrice?: number | null
  purchasePrice?: number | null
  isActive?: boolean
  sortOrder?: number
}

export type UpdateProductPackagingRequest = Partial<CreateProductPackagingRequest>
