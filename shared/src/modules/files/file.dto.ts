// Files — a generic upload/attachment system. A file row holds all metadata and
// can be attached to ANY entity via a polymorphic (entityType, entityId) pair
// (no DB FK — it's generic). The bytes live in the configured storage (local dir
// or S3) under a random `storedName`; the human `originalName` is kept here.

export type FileKind = 'image' | 'file'
export type FileStorage = 'local' | 's3'

export interface FileDto {
  id: string
  /** Human, original filename (e.g. "ön-yüz.jpg"). */
  originalName: string
  /** Random, unguessable name in storage (e.g. "<uuid>.jpg") — also the access key. */
  storedName: string
  mimeType: string
  /** Lowercase extension without the dot (e.g. "jpg"). */
  extension: string
  /** Size in bytes. */
  size: number
  kind: FileKind
  isImage: boolean
  /** Which backend stored the bytes (so it's served correctly even if config changes). */
  storage: FileStorage
  /** Polymorphic owner — entity class name + id, or null for an unattached file. */
  entityType: string | null
  entityId: string | null
  /** Ordering among an entity's files (e.g. image gallery order). */
  sortOrder: number
  createdAt: string
  updatedAt: string
}

// Metadata sent alongside the multipart upload (the binary parts are named `files`).
export interface UploadFileMeta {
  entityType?: string | null
  entityId?: string | null
  kind?: FileKind
  sortOrder?: number
}

export interface UpdateFileRequest {
  sortOrder?: number
  originalName?: string
  kind?: FileKind
  entityType?: string | null
  entityId?: string | null
}
