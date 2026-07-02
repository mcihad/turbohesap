import { LookupsPermissions } from '@turbohesap/shared'

import type { MobileModule } from '../types'

// Tanım Listeleri — generic key/value reference-data lists. Single-resource
// module: the tab opens directly on the lists overview.
export const lookupsModule: MobileModule = {
  key: 'lookups',
  label: 'Tanımlar',
  icon: 'list',
  home: 'lookups.lists',
  permission: LookupsPermissions.read,
  items: [
    {
      key: 'lookups.lists',
      title: 'Tanım Listeleri',
      icon: 'list',
      description: 'Birim, renk vb. key/value listeleri',
      permission: LookupsPermissions.read,
    },
    {
      key: 'lookups.code-prefixes',
      title: 'Kod Önekleri',
      icon: 'hash',
      description: 'Kod öneki ve sayaç ayarları',
      permission: LookupsPermissions.codePrefixesRead,
    },
  ],
}
