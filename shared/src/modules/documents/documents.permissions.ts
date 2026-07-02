// Permission keys for the Evrak (document management) module — fine-grained so
// most staff can file/read documents while privacy overrides and destructive
// actions stay reserved for a smaller group (mirrors the POS permission style).
export const DocumentsPermissions = {
  categoriesRead: 'documents.categories.read',
  categoriesWrite: 'documents.categories.write',
  documentsRead: 'documents.documents.read',
  documentsWrite: 'documents.documents.write',
  documentsDelete: 'documents.documents.delete',
  /** See other users' private documents/categories (list + direct get). */
  privateReadAll: 'documents.private.readAll',
  /** Set/change isPrivate or ownerId on a document/category you don't own. */
  privateManage: 'documents.private.manage',
  /** Rename/delete tags across all documents. */
  tagsManage: 'documents.tags.manage',
} as const

export type DocumentsPermission =
  (typeof DocumentsPermissions)[keyof typeof DocumentsPermissions]
