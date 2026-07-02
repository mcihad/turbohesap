// Permission keys for the Inventory module — SINGLE SOURCE OF TRUTH. Categories
// use read/write; products additionally gate DELETE separately (deleting a
// product is more sensitive than editing it), and STOCK separately (adjusting
// on-hand quantities is an operational task often given to warehouse staff who
// shouldn't edit the catalog itself).
export const InventoryPermissions = {
  categoriesRead: 'inventory.categories.read',
  categoriesWrite: 'inventory.categories.write',
  productsRead: 'inventory.products.read',
  productsWrite: 'inventory.products.write',
  productsDelete: 'inventory.products.delete',
  /** Adjust per-branch on-hand stock quantities. */
  productsStock: 'inventory.products.stock',
  /** Manage POS modifier groups/options and product attachments. */
  modifiersRead: 'inventory.modifiers.read',
  modifiersWrite: 'inventory.modifiers.write',
  // Demirbaş & Zimmet (fixed assets + custody). View the asset registry; edit the
  // master records (incl. lifecycle status: kayıp/hurda/çıkış); ASSIGN is the
  // custody operation (zimmet ver / devret / devral / iade — note: the mobile
  // receiver who scans to take custody needs this too); MAINTAIN covers
  // maintenance/repair and vehicle km/fuel logs.
  assetsRead: 'inventory.assets.read',
  assetsWrite: 'inventory.assets.write',
  assetsAssign: 'inventory.assets.assign',
  assetsMaintain: 'inventory.assets.maintain',
  // Ölçü birimi (UoM) sistemi — kategoriler + birimler + dönüşüm.
  uomRead: 'inventory.uom.read',
  uomWrite: 'inventory.uom.write',
} as const

export type InventoryPermission =
  (typeof InventoryPermissions)[keyof typeof InventoryPermissions]
