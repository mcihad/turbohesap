import type {
  AssetVehicleLogDto,
  AssetVehicleLogListQuery,
  CreateAssetVehicleLogRequest,
  UpdateAssetVehicleLogRequest,
} from './asset-vehicle-log.dto'

// Araç KM & Yakıt ledger. Creating/updating/removing a log re-derives the
// asset's currentOdometer (max odometer across its logs).
export interface IAssetVehicleLogsService {
  list(query?: AssetVehicleLogListQuery): Promise<AssetVehicleLogDto[]>
  get(id: string): Promise<AssetVehicleLogDto>
  create(input: CreateAssetVehicleLogRequest): Promise<AssetVehicleLogDto>
  update(
    id: string,
    input: UpdateAssetVehicleLogRequest,
  ): Promise<AssetVehicleLogDto>
  remove(id: string): Promise<void>
}
