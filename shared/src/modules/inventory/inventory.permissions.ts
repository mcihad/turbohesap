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
} as const

export type InventoryPermission =
  (typeof InventoryPermissions)[keyof typeof InventoryPermissions]
