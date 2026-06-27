// Permission keys for the Files module — SINGLE SOURCE OF TRUTH. Reading the raw
// bytes is public (the random storedName is an unguessable capability), so only
// listing/metadata and uploading/deleting are gated.
export const FilesPermissions = {
  read: 'files.read',
  write: 'files.write',
} as const

export type FilesPermission = (typeof FilesPermissions)[keyof typeof FilesPermissions]
