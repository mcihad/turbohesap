import { InventoryPermissions } from '@turbohesap/shared'

import type { PermissionDef } from '../../common/permission.types'

// Permission DEFINITIONS for the Inventory module. Products gate DELETE
// separately (a stronger action). Aggregated in src/permissions.catalog.ts.
export const INVENTORY_PERMISSION_DEFS: PermissionDef[] = [
  {
    key: InventoryPermissions.categoriesRead,
    description: 'Kategorileri görüntüleme',
    group: 'categories',
  },
  {
    key: InventoryPermissions.categoriesWrite,
    description: 'Kategori ekleme, düzenleme ve silme',
    group: 'categories',
  },
  {
    key: InventoryPermissions.productsRead,
    description: 'Ürünleri/stokları görüntüleme',
    group: 'products',
  },
  {
    key: InventoryPermissions.productsWrite,
    description: 'Ürün ekleme ve düzenleme',
    group: 'products',
  },
  {
    key: InventoryPermissions.productsDelete,
    description: 'Ürün silme',
    group: 'products',
  },
  {
    key: InventoryPermissions.productsStock,
    description: 'Şube bazında stok miktarlarını düzenleme',
    group: 'products',
  },
]
