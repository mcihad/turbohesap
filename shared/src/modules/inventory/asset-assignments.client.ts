import type { AxiosInstance } from 'axios'

import type {
  AssetAssignmentDto,
  AssetAssignmentListQuery,
  AssignAssetRequest,
  ReturnAssetRequest,
} from './asset-assignment.dto'
import type { IAssetAssignmentsService } from './asset-assignments.service'

// Axios implementation → /api/inventory/asset-assignments.
export class AssetAssignmentsApiClient implements IAssetAssignmentsService {
  constructor(private readonly http: AxiosInstance) {}

  async list(query?: AssetAssignmentListQuery): Promise<AssetAssignmentDto[]> {
    return (
      await this.http.get<AssetAssignmentDto[]>('/inventory/asset-assignments', {
        params: query,
      })
    ).data
  }

  async mine(): Promise<AssetAssignmentDto[]> {
    return (
      await this.http.get<AssetAssignmentDto[]>('/inventory/asset-assignments/mine')
    ).data
  }

  async assign(input: AssignAssetRequest): Promise<AssetAssignmentDto> {
    return (
      await this.http.post<AssetAssignmentDto>(
        '/inventory/asset-assignments',
        input,
      )
    ).data
  }

  async returnAsset(
    assetId: string,
    input?: ReturnAssetRequest,
  ): Promise<AssetAssignmentDto> {
    return (
      await this.http.post<AssetAssignmentDto>(
        `/inventory/asset-assignments/return/${assetId}`,
        input ?? {},
      )
    ).data
  }
}
