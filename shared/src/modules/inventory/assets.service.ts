import type {
  AssetDto,
  AssetListQuery,
  ChangeAssetStatusRequest,
  CreateAssetRequest,
  UpdateAssetRequest,
} from './asset.dto'

// Demirbaş (fixed asset) registry. CRUD plus a lifecycle status change
// (giriş/çıkış, kayıp, hurda…). Custody (zimmet), maintenance and vehicle logs
// are separate resources (see asset-assignments / asset-transfers /
// asset-maintenance / asset-vehicle-logs).
export interface IAssetsService {
  list(query?: AssetListQuery): Promise<AssetDto[]>
  get(id: string): Promise<AssetDto>
  create(input: CreateAssetRequest): Promise<AssetDto>
  update(id: string, input: UpdateAssetRequest): Promise<AssetDto>
  changeStatus(id: string, input: ChangeAssetStatusRequest): Promise<AssetDto>
  remove(id: string): Promise<void>
}
