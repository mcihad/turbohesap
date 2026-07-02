import { FileStack, FolderTree, LayoutDashboard } from 'lucide-react'

import { DocumentsPermissions } from '@turbohesap/shared'

import type { AppModule } from '@/modules/types'

// Evrak — generic document management: category tree (+ custom field schemas,
// gizlilik) and the evrak (document) records themselves (attributes, tags,
// süreli takip, files via the shared files API).
export const documentsModule: AppModule = {
  key: 'documents',
  label: 'Evrak',
  icon: FileStack,
  home: '/documents',
  nav: [
    {
      items: [
        { title: 'Gösterge Paneli', icon: LayoutDashboard, to: '/documents', exact: true },
        {
          title: 'Kategoriler',
          icon: FolderTree,
          to: '/documents/categories',
          keywords: ['kategori', 'ağaç', 'category', 'evrak'],
          permission: DocumentsPermissions.categoriesRead,
        },
        {
          title: 'Evraklar',
          icon: FileStack,
          to: '/documents/documents',
          keywords: ['evrak', 'belge', 'document', 'dosya'],
          permission: DocumentsPermissions.documentsRead,
        },
      ],
    },
  ],
}
