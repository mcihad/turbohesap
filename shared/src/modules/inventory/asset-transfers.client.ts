import type { AxiosInstance } from 'axios'

import type {
  AcceptTransferRequest,
  AssetTransferDto,
  AssetTransferListQuery,
  InitiateTransferRequest,
} from './asset-transfer.dto'
import type { IAssetTransfersService } from './asset-transfers.service'

// Axios implementation → /api/inventory/asset-transfers.
export class AssetTransfersApiClient implements IAssetTransfersService {
  constructor(private readonly http: AxiosInstance) {}

  async list(query?: AssetTransferListQuery): Promise<AssetTransferDto[]> {
    return (
      await this.http.get<AssetTransferDto[]>('/inventory/asset-transfers', {
        params: query,
      })
    ).data
  }

  async get(id: string): Promise<AssetTransferDto> {
    return (
      await this.http.get<AssetTransferDto>(`/inventory/asset-transfers/${id}`)
    ).data
  }

  async byToken(token: string): Promise<AssetTransferDto> {
    return (
      await this.http.get<AssetTransferDto>(
        `/inventory/asset-transfers/by-token/${token}`,
      )
    ).data
  }

  async initiate(input: InitiateTransferRequest): Promise<AssetTransferDto> {
    return (
      await this.http.post<AssetTransferDto>(
        '/inventory/asset-transfers',
        input,
      )
    ).data
  }

  async accept(input: AcceptTransferRequest): Promise<AssetTransferDto> {
    return (
      await this.http.post<AssetTransferDto>(
        '/inventory/asset-transfers/accept',
        input,
      )
    ).data
  }

  async reject(id: string): Promise<AssetTransferDto> {
    return (
      await this.http.post<AssetTransferDto>(
        `/inventory/asset-transfers/${id}/reject`,
        {},
      )
    ).data
  }

  async cancel(id: string): Promise<AssetTransferDto> {
    return (
      await this.http.post<AssetTransferDto>(
        `/inventory/asset-transfers/${id}/cancel`,
        {},
      )
    ).data
  }
}
