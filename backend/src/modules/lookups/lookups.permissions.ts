import { LookupsPermissions } from '@turbohesap/shared'

import type { PermissionDef } from '../../common/permission.types'

// Permission DEFINITIONS for the Lookups module. Aggregated in
// src/permissions.catalog.ts and auto-seeded on boot.
export const LOOKUPS_PERMISSION_DEFS: PermissionDef[] = [
  {
    key: LookupsPermissions.read,
    description: 'Tanım listelerini görüntüleme ve seçme',
    group: 'lookups',
  },
  {
    key: LookupsPermissions.write,
    description: 'Tanım listesi öğesi ekleme, düzenleme ve silme',
    group: 'lookups',
  },
]
