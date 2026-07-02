import type {
  CreateDocumentCategoryRequest,
  DocumentCategoryDto,
  UpdateDocumentCategoryRequest,
} from './document-category.dto'

// Contract for the evrak categories resource (/api/documents/categories).
// Returns a flat list (with parentId); clients build the tree. Rows the caller
// can't see (private, not owned, no override permission) are simply absent —
// enforced server-side, not a client-side filter.
export interface IDocumentCategoriesService {
  list(): Promise<DocumentCategoryDto[]>
  get(id: string): Promise<DocumentCategoryDto>
  create(input: CreateDocumentCategoryRequest): Promise<DocumentCategoryDto>
  update(
    id: string,
    input: UpdateDocumentCategoryRequest,
  ): Promise<DocumentCategoryDto>
  remove(id: string): Promise<void>
}
