import { InventoryPermissions } from '@turbohesap/shared'

import type { MobileModule } from '../types'

// Envanter — products/stock + category tree (with per-category custom fields).
export const inventoryModule: MobileModule = {
  key: 'inventory',
  label: 'Envanter',
  icon: 'box',
  home: 'inventory.home',
  permission: InventoryPermissions.productsRead,
  items: [
    {
      key: 'inventory.products',
      title: 'Ürünler',
      icon: 'box',
      description: 'Stok kartları',
      permission: InventoryPermissions.productsRead,
    },
    {
      key: 'inventory.categories',
      title: 'Kategoriler',
      icon: 'folder',
      description: 'Kategori ağacı ve özel alanlar',
      permission: InventoryPermissions.categoriesRead,
    },
  ],
}
