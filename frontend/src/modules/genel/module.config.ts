import {
  BarChart3,
  Boxes,
  FileText,
  Home,
  LayoutDashboard,
  PieChart,
  ShoppingCart,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react'
import { ReportsPermissions } from '@turbohesap/shared'

import type { AppModule } from '@/modules/types'

// Genel — overview/dashboards. The default module the app opens on.
export const genelModule: AppModule = {
  key: 'genel',
  label: 'Genel',
  icon: LayoutDashboard,
  home: '/genel/dashboard',
  nav: [
    {
      items: [
        { title: 'Gösterge Paneli', icon: Home, to: '/genel/dashboard', exact: true },
      ],
    },
    {
      label: 'Analiz',
      icon: BarChart3,
      items: [
        {
          title: 'Genel Özet',
          icon: PieChart,
          to: '/genel/analytics',
          exact: true,
          permission: ReportsPermissions.overview,
          keywords: ['raporlar', 'metrikler', 'özet', 'analiz'],
        },
        {
          title: 'POS',
          icon: ShoppingCart,
          to: '/genel/analytics/pos',
          permission: ReportsPermissions.pos,
          keywords: ['satış noktası', 'sipariş'],
        },
        {
          title: 'Stok',
          icon: Boxes,
          to: '/genel/analytics/inventory',
          permission: ReportsPermissions.inventory,
          keywords: ['envanter', 'ürün'],
        },
        {
          title: 'Finans',
          icon: Wallet,
          to: '/genel/analytics/finance',
          permission: ReportsPermissions.finance,
          keywords: ['gelir', 'gider', 'nakit'],
        },
        {
          title: 'Fatura',
          icon: FileText,
          to: '/genel/analytics/invoices',
          permission: ReportsPermissions.invoices,
          keywords: ['faturalama', 'kdv'],
        },
        {
          title: 'Cari',
          icon: Users,
          to: '/genel/analytics/contacts',
          permission: ReportsPermissions.contacts,
          keywords: ['müşteri', 'tedarikçi'],
        },
        {
          title: 'Satış',
          icon: TrendingUp,
          to: '/genel/analytics/sales',
          permission: ReportsPermissions.sales,
          keywords: ['ciro', 'kanal'],
        },
      ],
    },
  ],
}
