import { OrgPermissions } from '@turbohesap/shared'

import type { PermissionDef } from '../../common/permission.types'

// Permission DEFINITIONS for the Organization module. Aggregated in
// src/permissions.catalog.ts and auto-seeded on boot.
export const ORG_PERMISSION_DEFS: PermissionDef[] = [
  {
    key: OrgPermissions.branchesRead,
    description: 'Şubeleri görüntüleme',
    group: 'branches',
  },
  {
    key: OrgPermissions.branchesWrite,
    description: 'Şube ekleme, düzenleme ve silme',
    group: 'branches',
  },
]
