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
  {
    key: InventoryPermissions.modifiersRead,
    description: 'POS modifier gruplarını görüntüleme',
    group: 'products',
  },
  {
    key: InventoryPermissions.modifiersWrite,
    description: 'POS modifier grup/seçenek yönetimi',
    group: 'products',
  },
  {
    key: InventoryPermissions.assetsRead,
    description: 'Demirbaş ve zimmetleri görüntüleme',
    group: 'Demirbaş',
  },
  {
    key: InventoryPermissions.assetsWrite,
    description: 'Demirbaş ekleme, düzenleme ve durum (kayıp/hurda/çıkış)',
    group: 'Demirbaş',
  },
  {
    key: InventoryPermissions.assetsAssign,
    description: 'Zimmet verme, devretme, devralma ve iade',
    group: 'Demirbaş',
  },
  {
    key: InventoryPermissions.assetsMaintain,
    description: 'Bakım/onarım ve araç km/yakıt kayıtları',
    group: 'Demirbaş',
  },
]
