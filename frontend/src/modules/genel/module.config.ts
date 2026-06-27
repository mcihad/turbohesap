import { BarChart3, Home, LayoutDashboard } from 'lucide-react'

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
        {
          title: 'Analiz',
          icon: BarChart3,
          to: '/genel/analytics',
          keywords: ['raporlar', 'metrikler', 'analizler'],
        },
      ],
    },
  ],
}
