import type {
  CreateDocumentRequest,
  DocumentDto,
  DocumentListQuery,
  UpdateDocumentRequest,
} from './document.dto'

// Contract for the evrak resource (/api/documents/documents). Privacy is
// enforced server-side: a caller without `documents.private.readAll` never sees
// another user's private rows in `list()`, and `get()` on one 404s (not 403 —
// existence isn't leaked).
export interface IDocumentsService {
  list(query?: DocumentListQuery): Promise<DocumentDto[]>
  get(id: string): Promise<DocumentDto>
  create(input: CreateDocumentRequest): Promise<DocumentDto>
  update(id: string, input: UpdateDocumentRequest): Promise<DocumentDto>
  remove(id: string): Promise<void>
}

// Contract for the evrak tag admin resource (/api/documents/tags).
export interface IDocumentTagsService {
  list(): Promise<string[]>
  rename(from: string, to: string): Promise<void>
  remove(tag: string): Promise<void>
}
