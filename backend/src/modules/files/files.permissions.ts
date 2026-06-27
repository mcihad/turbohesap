import { FilesPermissions } from '@turbohesap/shared'

import type { PermissionDef } from '../../common/permission.types'

// Permission DEFINITIONS for the Files module (raw byte serving is public via the
// unguessable storedName, so it needs no permission). Aggregated in
// src/permissions.catalog.ts.
export const FILES_PERMISSION_DEFS: PermissionDef[] = [
  {
    key: FilesPermissions.read,
    description: 'Dosya/medya listeleme ve bilgilerini görüntüleme',
    group: 'files',
  },
  {
    key: FilesPermissions.write,
    description: 'Dosya/medya yükleme, düzenleme ve silme',
    group: 'files',
  },
]
