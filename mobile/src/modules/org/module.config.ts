import { OrgPermissions } from '@turbohesap/shared'

import type { MobileModule } from '../types'

// Organizasyon — branches. Mirrors the web org module.
export const orgModule: MobileModule = {
  key: 'org',
  label: 'Organizasyon',
  icon: 'briefcase',
  // Single-resource module: open the tab directly on the list.
  home: 'org.branches',
  permission: OrgPermissions.branchesRead,
  items: [
    {
      key: 'org.branches',
      title: 'Şubeler',
      icon: 'map-pin',
      description: 'Merkez, şube, depo, mağaza…',
      permission: OrgPermissions.branchesRead,
    },
  ],
}
