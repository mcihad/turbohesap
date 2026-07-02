import { DocumentsPermissions } from '@turbohesap/shared'

import type { MobileModule } from '../types'

// Evrak (document management) — a generic filing system for any kind of paper
// (sözleşme, ruhsat, sigorta poliçesi…), category-driven custom attributes,
// süreli (time-bound) tracking with expiry alerts, and kişiye özel (private)
// documents. Category tree editing (the fieldDefs schema) is a desk-only task
// on mobile — see `DocumentCategoriesScreen`.
export const documentsModule: MobileModule = {
  key: 'documents',
  label: 'Evrak',
  icon: 'archive',
  home: 'documents.home',
  permission: DocumentsPermissions.documentsRead,
  items: [
    {
      key: 'documents.documents',
      title: 'Evraklar',
      icon: 'file-text',
      description: 'Evrak kayıtları ve dosyalar',
      permission: DocumentsPermissions.documentsRead,
    },
    {
      key: 'documents.categories',
      title: 'Kategoriler',
      icon: 'folder',
      description: 'Evrak kategori ağacı',
      permission: DocumentsPermissions.categoriesRead,
    },
  ],
}
