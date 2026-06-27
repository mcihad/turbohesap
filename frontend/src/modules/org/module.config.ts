import { Building2, LayoutDashboard } from 'lucide-react'

import { OrgPermissions } from '@turbohesap/shared'

import type { AppModule } from '@/modules/types'

// Organizasyon — organization definitions, backed by /api/org/*. Currently the
// branches resource (users are authorized for branches).
export const orgModule: AppModule = {
  key: 'org',
  label: 'Organizasyon',
  icon: Building2,
  home: '/org',
  nav: [
    {
      items: [
        { title: 'Gösterge Paneli', icon: LayoutDashboard, to: '/org', exact: true },
        {
          title: 'Şubeler',
          icon: Building2,
          to: '/org/branches',
          keywords: ['şube', 'branch', 'lokasyon', 'mağaza', 'depo'],
          permission: OrgPermissions.branchesRead,
        },
      ],
    },
  ],
}
