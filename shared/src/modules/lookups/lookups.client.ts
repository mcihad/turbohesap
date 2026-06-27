import type { AxiosInstance } from 'axios'

import type {
  CreateLookupItemRequest,
  LookupItemDto,
  LookupListInfo,
  UpdateLookupItemRequest,
} from './lookup.dto'
import type { ILookupsService } from './lookups.service'

// Axios implementation of ILookupsService → /api/lookups.
export class LookupsApiClient implements ILookupsService {
  constructor(private readonly http: AxiosInstance) {}

  async list(list?: string): Promise<LookupItemDto[]> {
    return (
      await this.http.get<LookupItemDto[]>('/lookups/items', {
        params: list ? { list } : undefined,
      })
    ).data
  }

  async lists(): Promise<LookupListInfo[]> {
    return (await this.http.get<LookupListInfo[]>('/lookups/lists')).data
  }

  async get(id: string): Promise<LookupItemDto> {
    return (await this.http.get<LookupItemDto>(`/lookups/items/${id}`)).data
  }

  async create(input: CreateLookupItemRequest): Promise<LookupItemDto> {
    return (await this.http.post<LookupItemDto>('/lookups/items', input)).data
  }

  async update(
    id: string,
    input: UpdateLookupItemRequest,
  ): Promise<LookupItemDto> {
    return (await this.http.patch<LookupItemDto>(`/lookups/items/${id}`, input))
      .data
  }

  async remove(id: string): Promise<void> {
    await this.http.delete(`/lookups/items/${id}`)
  }
}
