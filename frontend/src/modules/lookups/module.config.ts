import { Hash, LayoutDashboard, ListChecks } from 'lucide-react'

import { LookupsPermissions } from '@turbohesap/shared'

import type { AppModule } from '@/modules/types'

// Tanımlar — generic key/value reference-data lists, backed by /api/lookups. The
// LookupSelect component consumes these everywhere. (More to come.)
export const lookupsModule: AppModule = {
  key: 'lookups',
  label: 'Tanımlar',
  icon: ListChecks,
  home: '/lookups',
  nav: [
    {
      items: [
        { title: 'Gösterge Paneli', icon: LayoutDashboard, to: '/lookups', exact: true },
        {
          title: 'Tanım Listeleri',
          icon: ListChecks,
          to: '/lookups/items',
          keywords: ['tanım', 'liste', 'birim', 'key', 'value', 'lookup'],
          permission: LookupsPermissions.read,
        },
        {
          title: 'Kod Önekleri',
          icon: Hash,
          to: '/lookups/code-prefixes',
          keywords: ['kod', 'önek', 'prefix', 'stok kodu', 'sayaç', 'numaralandırma'],
          permission: LookupsPermissions.codePrefixesRead,
        },
      ],
    },
  ],
}
