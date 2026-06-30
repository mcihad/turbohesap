import type { AxiosInstance } from 'axios'

import type {
  AssetDto,
  AssetListQuery,
  ChangeAssetStatusRequest,
  CreateAssetRequest,
  UpdateAssetRequest,
} from './asset.dto'
import type { IAssetsService } from './assets.service'

// Axios implementation → /api/inventory/assets.
export class AssetsApiClient implements IAssetsService {
  constructor(private readonly http: AxiosInstance) {}

  async list(query?: AssetListQuery): Promise<AssetDto[]> {
    return (
      await this.http.get<AssetDto[]>('/inventory/assets', { params: query })
    ).data
  }

  async get(id: string): Promise<AssetDto> {
    return (await this.http.get<AssetDto>(`/inventory/assets/${id}`)).data
  }

  async create(input: CreateAssetRequest): Promise<AssetDto> {
    return (await this.http.post<AssetDto>('/inventory/assets', input)).data
  }

  async update(id: string, input: UpdateAssetRequest): Promise<AssetDto> {
    return (await this.http.patch<AssetDto>(`/inventory/assets/${id}`, input)).data
  }

  async changeStatus(
    id: string,
    input: ChangeAssetStatusRequest,
  ): Promise<AssetDto> {
    return (
      await this.http.post<AssetDto>(`/inventory/assets/${id}/status`, input)
    ).data
  }

  async remove(id: string): Promise<void> {
    await this.http.delete(`/inventory/assets/${id}`)
  }
}
