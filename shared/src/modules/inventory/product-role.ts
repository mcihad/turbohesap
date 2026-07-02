// Product "role" — a form-level PRESET over the independent capability flags,
// NOT a stored column. The product model deliberately keeps `trackStock` +
// `canBeSold`/`canBePurchased`/`canBeManufactured` as independent flags (see
// the role-derivation note in `product.dto.ts`), which is powerful but leaves
// a user guessing which combination represents "a made-to-order pizza",
// "flour (raw material)" or "pizza dough (semi-finished)". This module maps a
// small set of business roles onto those flags so a form can offer one
// intent-driven picker and infer the role back when editing. The `type`
// column stays derived (for back-compat) — only the stoksuz/hizmet pair,
// which shares identical flags, uses `type` to disambiguate.

import type { ProductType } from './product.dto'

export type ProductRole = 'mamul' | 'yari_mamul' | 'hammadde' | 'ticari' | 'stoksuz' | 'hizmet'

/** Display order for role selectors. */
export const PRODUCT_ROLES: ProductRole[] = [
  'mamul',
  'yari_mamul',
  'hammadde',
  'ticari',
  'stoksuz',
  'hizmet',
]

export const PRODUCT_ROLE_LABELS: Record<ProductRole, string> = {
  mamul: 'Mamul (üretilen ürün)',
  yari_mamul: 'Yarı mamul (ara ürün)',
  hammadde: 'Hammadde',
  ticari: 'Ticari mal (al-sat)',
  stoksuz: 'Stoksuz / anında hazırlanan',
  hizmet: 'Hizmet',
}

/**
 * Sentinel label for a flag combination that matches no preset (kept OUT of
 * `PRODUCT_ROLE_LABELS` so `Object.entries(...)` in selectors only yields real,
 * pickable roles). Shown, but not newly selectable, when editing a product
 * whose flags were set by hand.
 */
export const PRODUCT_ROLE_CUSTOM_LABEL = 'Özel'

export interface ProductRolePreset {
  trackStock: boolean
  canBeSold: boolean
  canBePurchased: boolean
  canBeManufactured: boolean
  /** Derived `type` written for back-compat (the column is otherwise cosmetic). */
  type: ProductType
}

export const PRODUCT_ROLE_PRESETS: Record<ProductRole, ProductRolePreset> = {
  mamul: { trackStock: true, canBeSold: true, canBePurchased: true, canBeManufactured: true, type: 'stockable' },
  yari_mamul: { trackStock: true, canBeSold: false, canBePurchased: false, canBeManufactured: true, type: 'stockable' },
  hammadde: { trackStock: true, canBeSold: false, canBePurchased: true, canBeManufactured: false, type: 'stockable' },
  ticari: { trackStock: true, canBeSold: true, canBePurchased: true, canBeManufactured: false, type: 'stockable' },
  stoksuz: { trackStock: false, canBeSold: true, canBePurchased: false, canBeManufactured: false, type: 'stockable' },
  hizmet: { trackStock: false, canBeSold: true, canBePurchased: false, canBeManufactured: false, type: 'service' },
}

export interface ProductRoleFlags {
  trackStock: boolean
  canBeSold: boolean
  canBePurchased: boolean
  canBeManufactured: boolean
  type: ProductType
}

/**
 * Reverse of the presets: given a product's flags, return the role it
 * represents, or `'custom'` if no preset matches. `type` is only consulted to
 * split the otherwise-identical `stoksuz`/`hizmet` pair — every other role has
 * a unique flag-tuple, so a legacy product whose `type` doesn't line up still
 * infers correctly from its flags.
 */
export function inferProductRole(p: ProductRoleFlags): ProductRole | 'custom' {
  const { trackStock, canBeSold, canBePurchased, canBeManufactured, type } = p

  // Ambiguous flag combo shared by stoksuz + hizmet — disambiguate by type.
  if (!trackStock && canBeSold && !canBePurchased && !canBeManufactured) {
    return type === 'service' ? 'hizmet' : 'stoksuz'
  }

  const match = PRODUCT_ROLES.find((r) => {
    const preset = PRODUCT_ROLE_PRESETS[r]
    return (
      preset.trackStock === trackStock &&
      preset.canBeSold === canBeSold &&
      preset.canBePurchased === canBePurchased &&
      preset.canBeManufactured === canBeManufactured
    )
  })
  return match ?? 'custom'
}
