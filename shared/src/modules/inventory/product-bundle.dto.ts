// Product bundle components — extra products handed out together with a product
// at POS (e.g. a pizza comes with 2 ketchups, or "buy a coat get a t-shirt").
// Each component is auto-added as a separate cart/order line when the parent
// product is sold. Components can be free (₺0) or priced, optionally deduct
// stock, and optionally be returnable (geri giriş).

export interface ProductBundleComponentDto {
  id: string
  /** The parent product this component is bundled with. */
  productId: string
  /** The product handed out (the component/given item). */
  componentProductId: string
  componentVariantId: string | null
  /** COMPUTED display fields for the editor/cart. */
  componentName: string
  componentUnit: string
  /** Quantity of the component given per 1 unit of the parent. */
  qty: number
  /** When true the component is free (line price 0). */
  isFree: boolean
  /** Explicit line price when not free (null → fall back to product salePrice). */
  unitPrice: number | null
  /** When true, settling the order deducts the component from stock. */
  deductStock: boolean
  /** When true, the component can be returned to stock (geri giriş). */
  returnable: boolean
  sortOrder: number
}

export interface SetBundleComponentInput {
  componentProductId: string
  componentVariantId?: string | null
  qty?: number
  isFree?: boolean
  unitPrice?: number | null
  deductStock?: boolean
  returnable?: boolean
  sortOrder?: number
}

/** Replace the full set of bundle components for a product. */
export interface SetProductBundleRequest {
  components: SetBundleComponentInput[]
}
