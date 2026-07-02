import type { AxiosInstance } from 'axios'

import type {
  BomDto,
  BomListQuery,
  CreateBomRequest,
  UpdateBomRequest,
} from './bom.dto'
import type { IBomsService } from './boms.service'

// Axios implementation → /api/production/boms.
export class BomsApiClient implements IBomsService {
  constructor(private readonly http: AxiosInstance) {}

  async list(query?: BomListQuery): Promise<BomDto[]> {
    return (await this.http.get<BomDto[]>('/production/boms', { params: query })).data
  }
  async get(id: string): Promise<BomDto> {
    return (await this.http.get<BomDto>(`/production/boms/${id}`)).data
  }
  async create(input: CreateBomRequest): Promise<BomDto> {
    return (await this.http.post<BomDto>('/production/boms', input)).data
  }
  async update(id: string, input: UpdateBomRequest): Promise<BomDto> {
    return (await this.http.patch<BomDto>(`/production/boms/${id}`, input)).data
  }
  async remove(id: string): Promise<void> {
    await this.http.delete(`/production/boms/${id}`)
  }
}
