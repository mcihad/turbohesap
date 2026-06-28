// Inventory products. A product is a catalog item that may be a **simple**
// product or a **template** with variants. It reuses the org `branches` as stock
// locations and the `sales.channels` as price lists. Modelled after Odoo /
// ERPNext: template → variants (by attributes), packagings (unit multipliers),
// per-location stock, and per-channel prices.

import type { CategorySummary } from './category.dto'
import type { ProductVariantDto } from './product-variant.dto'
import type { ProductPackagingDto } from './product-packaging.dto'
import type { ProductStockDto } from './product-stock.dto'
import type { ProductChannelPriceDto } from './product-channel-price.dto'

// Stockable goods vs services vs consumables (no stock tracking).
export type ProductType = 'stockable' | 'service' | 'consumable'

export const PRODUCT_TYPES: ProductType[] = ['stockable', 'service', 'consumable']

// One variant axis on a template, e.g. { name: "Renk", values: ["Kırmızı","Mavi"] }.
// `lookupList` optionally pulls suggested values from a lookups list.
export interface VariantAttribute {
  name: string
  lookupList?: string
  values: string[]
}

export interface ProductDto {
  id: string
  /** Stock keeping unit — unique. */
  code: string
  name: string
  description: string
  /** Primary barcode (simple product or template). Variants/packs add their own. */
  barcode: string
  /** Every barcode for this product (primary + variants + packagings), deduped.
   *  Populated on both list and detail so search can match sub-barcodes. */
  barcodes: string[]
  brand: string

  type: ProductType
  /** Whether on-hand stock is tracked for this product. */
  trackStock: boolean

  categoryId: string | null
  category: CategorySummary | null

  /** Base unit of measure — a `birim` lookup key (e.g. "ADET"). */
  unit: string

  // Variants
  /** True when this is a template configured by `variantAttributes`. */
  hasVariants: boolean
  variantAttributes: VariantAttribute[]
  variantCount: number

  // Fiyatlandırma (base prices; variants/channels/packs may override)
  purchasePrice: number | null
  salePrice: number | null
  taxRate: number | null
  currency: string

  // Stok — `quantity` is the general/fallback on-hand; `stock[]` holds the
  // per-branch breakdown. `totalStock` = sum of `stock[]` if any, else `quantity`.
  quantity: number
  minQuantity: number
  totalStock: number

  weight: number | null
  imageUrl: string
  isActive: boolean

  /** Category-specific custom attribute values (keyed by CategoryFieldDef.key). */
  attributes: Record<string, unknown>

  /** Distinct sales-channel ids that have a price for this product (or its
   *  variants). Populated on list + detail so products can be filtered by
   *  channel without loading the full price rows. */
  channelIds: string[]

  // Embedded sub-resources — populated on GET /:id (empty on the list endpoint).
  variants: ProductVariantDto[]
  packagings: ProductPackagingDto[]
  stock: ProductStockDto[]
  channelPrices: ProductChannelPriceDto[]

  createdAt: string
  updatedAt: string
}

export interface CreateProductRequest {
  code: string
  name: string
  description?: string
  barcode?: string
  brand?: string
  type?: ProductType
  trackStock?: boolean
  categoryId?: string | null
  unit?: string
  hasVariants?: boolean
  variantAttributes?: VariantAttribute[]
  purchasePrice?: number | null
  salePrice?: number | null
  taxRate?: number | null
  currency?: string
  quantity?: number
  minQuantity?: number
  weight?: number | null
  imageUrl?: string
  isActive?: boolean
  attributes?: Record<string, unknown>
  /** Optional per-branch opening stock (branchId null = genel). */
  stocks?: { branchId: string | null; quantity: number }[]
}

export type UpdateProductRequest = Partial<CreateProductRequest>
