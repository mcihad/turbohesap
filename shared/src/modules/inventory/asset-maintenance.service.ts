import type {
  AssetMaintenanceDto,
  AssetMaintenanceListQuery,
  CreateAssetMaintenanceRequest,
  UpdateAssetMaintenanceRequest,
} from './asset-maintenance.dto'

// Bakım/Onarım ledger for assets.
export interface IAssetMaintenanceService {
  list(query?: AssetMaintenanceListQuery): Promise<AssetMaintenanceDto[]>
  get(id: string): Promise<AssetMaintenanceDto>
  create(input: CreateAssetMaintenanceRequest): Promise<AssetMaintenanceDto>
  update(
    id: string,
    input: UpdateAssetMaintenanceRequest,
  ): Promise<AssetMaintenanceDto>
  remove(id: string): Promise<void>
}
