// Product recipe ("reçete") components — the ingredients silently consumed from
// stock when a menu item (pizza, köfte, hamburger) is SOLD. Unlike a bundle,
// ingredients are NOT shown as separate priced cart lines: they are a silent
// backflush at POS settle and sales-invoice issue, valued at ingredient AVCO.
// Recipe items are typically non-stock-tracked ("Stoksuz / anında hazırlanan").

export interface RecipeComponentDto {
  id: string
  /** The parent (sold) product this recipe belongs to. */
  productId: string
  /** The ingredient product consumed from stock. */
  componentProductId: string
  componentVariantId: string | null
  /** COMPUTED display fields for the editor. */
  componentName: string
  componentUnit: string
  /** Quantity of the ingredient consumed per 1 unit of the parent sold. */
  quantity: number
  /** Optional unit override for the consumed line (defaults to ingredient unit). */
  unit: string | null
  sortOrder: number
}

export interface SetRecipeComponentInput {
  componentProductId: string
  componentVariantId?: string | null
  quantity?: number
  unit?: string | null
  sortOrder?: number
}

/** Replace the full set of recipe components for a product. */
export interface SetProductRecipeRequest {
  components: SetRecipeComponentInput[]
}
