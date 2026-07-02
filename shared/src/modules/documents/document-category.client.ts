import type { AxiosInstance } from 'axios'

import type {
  CreateDocumentCategoryRequest,
  DocumentCategoryDto,
  UpdateDocumentCategoryRequest,
} from './document-category.dto'
import type { IDocumentCategoriesService } from './document-category.service'

// Axios implementation → /api/documents/categories.
export class DocumentCategoriesApiClient implements IDocumentCategoriesService {
  constructor(private readonly http: AxiosInstance) {}

  async list(): Promise<DocumentCategoryDto[]> {
    return (await this.http.get<DocumentCategoryDto[]>('/documents/categories')).data
  }

  async get(id: string): Promise<DocumentCategoryDto> {
    return (await this.http.get<DocumentCategoryDto>(`/documents/categories/${id}`)).data
  }

  async create(input: CreateDocumentCategoryRequest): Promise<DocumentCategoryDto> {
    return (await this.http.post<DocumentCategoryDto>('/documents/categories', input)).data
  }

  async update(
    id: string,
    input: UpdateDocumentCategoryRequest,
  ): Promise<DocumentCategoryDto> {
    return (
      await this.http.patch<DocumentCategoryDto>(`/documents/categories/${id}`, input)
    ).data
  }

  async remove(id: string): Promise<void> {
    await this.http.delete(`/documents/categories/${id}`)
  }
}
