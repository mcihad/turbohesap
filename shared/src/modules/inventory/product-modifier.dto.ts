// Product modifiers (POS) — reusable option groups attached to products. A group
// (e.g. "Ekstra Soslar") holds options each with a +/- price delta ("Extra sos
// +₺5", "Soğan çıkar −₺0"). Groups attach to many products (M:N) so one group is
// defined once and reused. Used by the POS modifier sheet.

export type ModifierSelectionType = 'single' | 'multi'
export const MODIFIER_SELECTION_TYPES: ModifierSelectionType[] = ['single', 'multi']

export interface ProductModifierOptionDto {
  id: string
  groupId: string
  name: string
  /** Added to (or subtracted from, if negative) the line price when chosen. */
  priceDelta: number
  isDefault: boolean
  sortOrder: number
  isActive: boolean
  /** When set, choosing this option ALSO consumes stock of this product
   *  (e.g. "Ekstra ketçap" → deduct 1 from the ketchup product). Optional. */
  stockProductId: string | null
  /** Optional variant of the consumed stock product. */
  stockVariantId: string | null
  /** How many units of the stock product to consume per line unit (default 1). */
  consumeQty: number
  /** When false, the stock product is NOT deducted even if linked. */
  deductStock: boolean
  /** When true, this consumed item can be returned to stock (geri giriş). */
  returnable: boolean
}

export interface ProductModifierGroupDto {
  id: string
  name: string
  selectionType: ModifierSelectionType
  /** When true the cashier must pick at least `minSelect` options. */
  required: boolean
  minSelect: number
  /** null = unlimited (only meaningful for multi). */
  maxSelect: number | null
  sortOrder: number
  isActive: boolean
  options: ProductModifierOptionDto[]
  /** COMPUTED: how many products this group is attached to (list convenience). */
  productCount: number
}

export interface CreateModifierOptionRequest {
  name: string
  priceDelta?: number
  isDefault?: boolean
  sortOrder?: number
  isActive?: boolean
  stockProductId?: string | null
  stockVariantId?: string | null
  consumeQty?: number
  deductStock?: boolean
  returnable?: boolean
}
export type UpdateModifierOptionRequest = Partial<CreateModifierOptionRequest>

export interface CreateModifierGroupRequest {
  name: string
  selectionType?: ModifierSelectionType
  required?: boolean
  minSelect?: number
  maxSelect?: number | null
  sortOrder?: number
  isActive?: boolean
  /** Optional initial options created with the group. */
  options?: CreateModifierOptionRequest[]
}
export type UpdateModifierGroupRequest = Partial<Omit<CreateModifierGroupRequest, 'options'>>

/** Replace the set of modifier groups attached to a product (ordered). */
export interface SetProductModifiersRequest {
  groupIds: string[]
}
