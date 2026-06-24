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
        { title: 'Panel', icon: Home, to: '/genel/dashboard' },
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
