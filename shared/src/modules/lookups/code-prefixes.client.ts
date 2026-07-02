import type { AxiosInstance } from 'axios'

import type {
  CodePrefixDto,
  ConsumeCodeResponse,
  CreateCodePrefixRequest,
  PeekCodeResponse,
  UpdateCodePrefixRequest,
} from './code-prefix.dto'
import type { ICodePrefixesService } from './code-prefixes.service'

// Axios implementation of ICodePrefixesService → /api/lookups/code-prefixes.
export class CodePrefixesApiClient implements ICodePrefixesService {
  constructor(private readonly http: AxiosInstance) {}

  async list(context?: string): Promise<CodePrefixDto[]> {
    return (
      await this.http.get<CodePrefixDto[]>('/lookups/code-prefixes', {
        params: context ? { context } : undefined,
      })
    ).data
  }

  async get(id: string): Promise<CodePrefixDto> {
    return (await this.http.get<CodePrefixDto>(`/lookups/code-prefixes/${id}`)).data
  }

  async create(input: CreateCodePrefixRequest): Promise<CodePrefixDto> {
    return (await this.http.post<CodePrefixDto>('/lookups/code-prefixes', input)).data
  }

  async update(id: string, input: UpdateCodePrefixRequest): Promise<CodePrefixDto> {
    return (
      await this.http.patch<CodePrefixDto>(`/lookups/code-prefixes/${id}`, input)
    ).data
  }

  async remove(id: string): Promise<void> {
    await this.http.delete(`/lookups/code-prefixes/${id}`)
  }

  async peek(id: string): Promise<PeekCodeResponse> {
    return (
      await this.http.get<PeekCodeResponse>(`/lookups/code-prefixes/${id}/peek`)
    ).data
  }

  async consume(id: string): Promise<ConsumeCodeResponse> {
    return (
      await this.http.post<ConsumeCodeResponse>(`/lookups/code-prefixes/${id}/consume`)
    ).data
  }
}
