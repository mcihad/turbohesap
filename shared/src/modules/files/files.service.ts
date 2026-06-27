import type { FileDto, UpdateFileRequest } from './file.dto'

// Contract for the files resource (/api/files). Upload is multipart: the caller
// builds a FormData with one or more `files` parts plus the metadata fields
// (entityType, entityId, kind, sortOrder) — the shape differs per platform (web
// File objects vs RN { uri, name, type }), so the client takes a ready FormData.
export interface IFilesService {
  /** Files attached to one entity, ordered by sortOrder. */
  list(entityType: string, entityId: string): Promise<FileDto[]>
  get(id: string): Promise<FileDto>
  /** Upload one or more files (multipart FormData with `files` parts + meta). */
  upload(form: FormData): Promise<FileDto[]>
  update(id: string, input: UpdateFileRequest): Promise<FileDto>
  remove(id: string): Promise<void>
  /** Public URL to the raw bytes (absolute on mobile, same-origin on web). */
  rawUrl(storedName: string): string
}
