import { ClipboardList, FileText, LayoutDashboard, PackageCheck, Truck } from 'lucide-react'

import { OrdersPermissions } from '@turbohesap/shared'

import type { AppModule } from '@/modules/types'

export const ordersModule: AppModule = {
  key: 'orders',
  label: 'Siparişler',
  icon: ClipboardList,
  home: '/orders',
  nav: [
    {
      items: [
        { title: 'Gösterge Paneli', icon: LayoutDashboard, to: '/orders', exact: true },
        {
          title: 'Teklifler',
          icon: FileText,
          to: '/orders/quotes',
          keywords: ['teklif', 'quote', 'satış', 'alış'],
          permission: OrdersPermissions.read,
        },
        {
          title: 'Siparişler',
          icon: PackageCheck,
          to: '/orders/sales',
          keywords: ['sipariş', 'order', 'satış', 'alış'],
          permission: OrdersPermissions.read,
        },
        {
          title: 'İrsaliyeler',
          icon: Truck,
          to: '/orders/deliveries',
          keywords: ['irsaliye', 'irsaliye', 'delivery', 'sevk'],
          permission: OrdersPermissions.read,
        },
      ],
    },
  ],
}
