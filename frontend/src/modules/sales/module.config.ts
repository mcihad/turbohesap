import { LayoutDashboard, Store } from 'lucide-react'

import { SalesPermissions } from '@turbohesap/shared'

import type { AppModule } from '@/modules/types'

// Satış — sales definitions, backed by /api/sales/*. Currently the sales
// channels resource (later used by products).
export const salesModule: AppModule = {
  key: 'sales',
  label: 'Satış',
  icon: Store,
  home: '/sales',
  nav: [
    {
      items: [
        { title: 'Gösterge Paneli', icon: LayoutDashboard, to: '/sales', exact: true },
        {
          title: 'Satış Kanalları',
          icon: Store,
          to: '/sales/channels',
          keywords: ['kanal', 'channel', 'satış', 'pazaryeri'],
          permission: SalesPermissions.channelsRead,
        },
      ],
    },
  ],
}
