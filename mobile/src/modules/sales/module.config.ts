import { SalesPermissions } from '@turbohesap/shared'

import type { MobileModule } from '../types'

// Satış — sales definitions (channels). Mirrors the web sales module.
export const salesModule: MobileModule = {
  key: 'sales',
  label: 'Satış',
  icon: 'shopping-bag',
  // Single-resource module: open the tab directly on the list.
  home: 'sales.channels',
  permission: SalesPermissions.channelsRead,
  items: [
    {
      key: 'sales.channels',
      title: 'Satış Kanalları',
      icon: 'shopping-bag',
      description: 'Perakende, online, pazaryeri…',
      permission: SalesPermissions.channelsRead,
    },
  ],
}
