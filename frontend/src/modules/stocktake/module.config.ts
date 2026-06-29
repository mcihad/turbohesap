import { ClipboardCheck, LayoutDashboard, ScanLine } from 'lucide-react'

import { StocktakePermissions } from '@turbohesap/shared'

import type { AppModule } from '@/modules/types'

export const stocktakeModule: AppModule = {
  key: 'stocktake',
  label: 'Sayım',
  icon: ClipboardCheck,
  home: '/stocktake',
  nav: [
    {
      items: [
        { title: 'Gösterge Paneli', icon: LayoutDashboard, to: '/stocktake', exact: true },
        {
          title: 'Sayımlar',
          icon: ScanLine,
          to: '/stocktake/counts',
          keywords: ['sayım', 'stok sayımı', 'stocktake', 'envanter', 'count'],
          permission: StocktakePermissions.read,
        },
      ],
    },
  ],
}
