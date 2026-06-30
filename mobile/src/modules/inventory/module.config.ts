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
    {
      key: 'inventory.assets',
      title: 'Demirbaşlar',
      icon: 'truck',
      description: 'Demirbaş ve zimmet',
      permission: InventoryPermissions.assetsRead,
    },
    {
      key: 'inventory.myAssignments',
      title: 'Zimmetlerim',
      icon: 'user-check',
      description: 'Bana zimmetli ekipman',
      permission: InventoryPermissions.assetsRead,
    },
    {
      key: 'inventory.transferReceive',
      title: 'Zimmet Devral',
      icon: 'maximize',
      description: 'Barkod okutarak devral',
      permission: InventoryPermissions.assetsAssign,
    },
  ],
}
