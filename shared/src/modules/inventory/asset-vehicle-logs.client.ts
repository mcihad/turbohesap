import type { AxiosInstance } from 'axios'

import type {
  AssetVehicleLogDto,
  AssetVehicleLogListQuery,
  CreateAssetVehicleLogRequest,
  UpdateAssetVehicleLogRequest,
} from './asset-vehicle-log.dto'
import type { IAssetVehicleLogsService } from './asset-vehicle-logs.service'

// Axios implementation → /api/inventory/asset-vehicle-logs.
export class AssetVehicleLogsApiClient implements IAssetVehicleLogsService {
  constructor(private readonly http: AxiosInstance) {}

  async list(
    query?: AssetVehicleLogListQuery,
  ): Promise<AssetVehicleLogDto[]> {
    return (
      await this.http.get<AssetVehicleLogDto[]>(
        '/inventory/asset-vehicle-logs',
        { params: query },
      )
    ).data
  }

  async get(id: string): Promise<AssetVehicleLogDto> {
    return (
      await this.http.get<AssetVehicleLogDto>(
        `/inventory/asset-vehicle-logs/${id}`,
      )
    ).data
  }

  async create(
    input: CreateAssetVehicleLogRequest,
  ): Promise<AssetVehicleLogDto> {
    return (
      await this.http.post<AssetVehicleLogDto>(
        '/inventory/asset-vehicle-logs',
        input,
      )
    ).data
  }

  async update(
    id: string,
    input: UpdateAssetVehicleLogRequest,
  ): Promise<AssetVehicleLogDto> {
    return (
      await this.http.patch<AssetVehicleLogDto>(
        `/inventory/asset-vehicle-logs/${id}`,
        input,
      )
    ).data
  }

  async remove(id: string): Promise<void> {
    await this.http.delete(`/inventory/asset-vehicle-logs/${id}`)
  }
}
