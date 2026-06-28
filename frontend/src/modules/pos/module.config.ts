import { LayoutDashboard, Monitor, ShoppingCart, SlidersHorizontal, Table2 } from 'lucide-react'

import { PosPermissions, InventoryPermissions } from '@turbohesap/shared'

import type { AppModule } from '@/modules/types'

export const posModule: AppModule = {
  key: 'pos',
  label: 'POS',
  icon: ShoppingCart,
  home: '/pos/dashboard',
  nav: [
    {
      items: [
        {
          title: 'Gösterge Paneli',
          icon: LayoutDashboard,
          to: '/pos/dashboard',
          exact: true,
          keywords: ['pos', 'panel', 'dashboard'],
          permission: PosPermissions.sell,
        },
        {
          title: 'Satış Ekranı',
          icon: ShoppingCart,
          to: '/pos',
          exact: true,
          keywords: ['pos', 'satış', 'kasa', 'sell', 'terminal'],
          permission: PosPermissions.sell,
        },
        {
          title: 'Kasalar',
          icon: Monitor,
          to: '/pos/registers',
          keywords: ['kasa', 'terminal', 'register'],
          permission: PosPermissions.registersRead,
        },
        {
          title: 'Katlar & Masalar',
          icon: Table2,
          to: '/pos/floors',
          keywords: ['masa', 'kat', 'table', 'floor', 'restoran'],
          permission: PosPermissions.tablesManage,
        },
        {
          title: 'Ürün Seçenekleri',
          icon: SlidersHorizontal,
          to: '/pos/modifiers',
          keywords: ['modifier', 'seçenek', 'ekstra', 'opsiyon'],
          permission: InventoryPermissions.modifiersRead,
        },
      ],
    },
  ],
}
