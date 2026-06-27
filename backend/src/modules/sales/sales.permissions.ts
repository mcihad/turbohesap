import { SalesPermissions } from '@turbohesap/shared'

import type { PermissionDef } from '../../common/permission.types'

// Permission DEFINITIONS for the Sales module: the shared key (single source of
// truth) + a Turkish description + UI group. Aggregated in
// src/permissions.catalog.ts and auto-seeded on boot.
export const SALES_PERMISSION_DEFS: PermissionDef[] = [
  {
    key: SalesPermissions.channelsRead,
    description: 'Satış kanallarını görüntüleme',
    group: 'channels',
  },
  {
    key: SalesPermissions.channelsWrite,
    description: 'Satış kanalı ekleme, düzenleme ve silme',
    group: 'channels',
  },
]
