import { Boxes, FolderTree, LayoutDashboard, Package } from 'lucide-react'

import { InventoryPermissions } from '@turbohesap/shared'

import type { AppModule } from '@/modules/types'

// Envanter — product categories (tree + custom field schemas) and products/stock.
export const inventoryModule: AppModule = {
  key: 'inventory',
  label: 'Envanter',
  icon: Boxes,
  home: '/inventory',
  nav: [
    {
      items: [
        { title: 'Gösterge Paneli', icon: LayoutDashboard, to: '/inventory', exact: true },
        {
          title: 'Ürünler',
          icon: Package,
          to: '/inventory/products',
          keywords: ['stok', 'ürün', 'product'],
          permission: InventoryPermissions.productsRead,
        },
        {
          title: 'Kategoriler',
          icon: FolderTree,
          to: '/inventory/categories',
          keywords: ['kategori', 'ağaç', 'category'],
          permission: InventoryPermissions.categoriesRead,
        },
      ],
    },
  ],
}
