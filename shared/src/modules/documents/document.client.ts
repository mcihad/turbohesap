import type { AxiosInstance } from 'axios'

import type {
  CreateDocumentRequest,
  DocumentDto,
  DocumentListQuery,
} from './document.dto'
import type { UpdateDocumentRequest } from './document.dto'
import type { IDocumentsService, IDocumentTagsService } from './document.service'

// Axios implementation → /api/documents/documents.
export class DocumentsApiClient implements IDocumentsService {
  constructor(private readonly http: AxiosInstance) {}

  async list(query?: DocumentListQuery): Promise<DocumentDto[]> {
    return (
      await this.http.get<DocumentDto[]>('/documents/documents', { params: query })
    ).data
  }

  async get(id: string): Promise<DocumentDto> {
    return (await this.http.get<DocumentDto>(`/documents/documents/${id}`)).data
  }

  async create(input: CreateDocumentRequest): Promise<DocumentDto> {
    return (await this.http.post<DocumentDto>('/documents/documents', input)).data
  }

  async update(id: string, input: UpdateDocumentRequest): Promise<DocumentDto> {
    return (
      await this.http.patch<DocumentDto>(`/documents/documents/${id}`, input)
    ).data
  }

  async remove(id: string): Promise<void> {
    await this.http.delete(`/documents/documents/${id}`)
  }
}

// Axios implementation → /api/documents/tags.
export class DocumentTagsApiClient implements IDocumentTagsService {
  constructor(private readonly http: AxiosInstance) {}

  async list(): Promise<string[]> {
    return (await this.http.get<string[]>('/documents/tags')).data
  }

  async rename(from: string, to: string): Promise<void> {
    await this.http.post('/documents/tags/rename', { from, to })
  }

  async remove(tag: string): Promise<void> {
    await this.http.delete(`/documents/tags/${encodeURIComponent(tag)}`)
  }
}
