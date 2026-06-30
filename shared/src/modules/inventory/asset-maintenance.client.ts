import type { AxiosInstance } from 'axios'

import type {
  AssetMaintenanceDto,
  AssetMaintenanceListQuery,
  CreateAssetMaintenanceRequest,
  UpdateAssetMaintenanceRequest,
} from './asset-maintenance.dto'
import type { IAssetMaintenanceService } from './asset-maintenance.service'

// Axios implementation → /api/inventory/asset-maintenance.
export class AssetMaintenanceApiClient implements IAssetMaintenanceService {
  constructor(private readonly http: AxiosInstance) {}

  async list(
    query?: AssetMaintenanceListQuery,
  ): Promise<AssetMaintenanceDto[]> {
    return (
      await this.http.get<AssetMaintenanceDto[]>('/inventory/asset-maintenance', {
        params: query,
      })
    ).data
  }

  async get(id: string): Promise<AssetMaintenanceDto> {
    return (
      await this.http.get<AssetMaintenanceDto>(
        `/inventory/asset-maintenance/${id}`,
      )
    ).data
  }

  async create(
    input: CreateAssetMaintenanceRequest,
  ): Promise<AssetMaintenanceDto> {
    return (
      await this.http.post<AssetMaintenanceDto>(
        '/inventory/asset-maintenance',
        input,
      )
    ).data
  }

  async update(
    id: string,
    input: UpdateAssetMaintenanceRequest,
  ): Promise<AssetMaintenanceDto> {
    return (
      await this.http.patch<AssetMaintenanceDto>(
        `/inventory/asset-maintenance/${id}`,
        input,
      )
    ).data
  }

  async remove(id: string): Promise<void> {
    await this.http.delete(`/inventory/asset-maintenance/${id}`)
  }
}
