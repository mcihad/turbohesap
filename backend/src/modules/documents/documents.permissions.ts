import { DocumentsPermissions } from '@turbohesap/shared'

import type { PermissionDef } from '../../common/permission.types'

// Permission DEFINITIONS for the Evrak (document management) module.
// Aggregated in src/permissions.catalog.ts.
export const DOCUMENTS_PERMISSION_DEFS: PermissionDef[] = [
  {
    key: DocumentsPermissions.categoriesRead,
    description: 'Evrak kategorilerini görüntüleme',
    group: 'categories',
  },
  {
    key: DocumentsPermissions.categoriesWrite,
    description: 'Evrak kategorisi ekleme, düzenleme ve silme',
    group: 'categories',
  },
  {
    key: DocumentsPermissions.documentsRead,
    description: 'Evrakları görüntüleme',
    group: 'documents',
  },
  {
    key: DocumentsPermissions.documentsWrite,
    description: 'Evrak ekleme ve düzenleme',
    group: 'documents',
  },
  {
    key: DocumentsPermissions.documentsDelete,
    description: 'Evrak silme',
    group: 'documents',
  },
  {
    key: DocumentsPermissions.privateReadAll,
    description: 'Başkasına ait kişiye özel evrak/kategorileri görüntüleme',
    group: 'privacy',
  },
  {
    key: DocumentsPermissions.privateManage,
    description: 'Başkasına ait evrak/kategoride gizlilik veya sahip değiştirme',
    group: 'privacy',
  },
  {
    key: DocumentsPermissions.tagsManage,
    description: 'Tüm evraklardaki etiketleri yeniden adlandırma ve silme',
    group: 'tags',
  },
]
