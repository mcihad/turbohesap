import type {
  AcceptTransferRequest,
  AssetTransferDto,
  AssetTransferListQuery,
  InitiateTransferRequest,
} from './asset-transfer.dto'

// Zimmet devri handshake. `initiate` (holder) → `byToken` (receiver scans QR) →
// `accept` (receiver confirms "Devraldım"). `reject`/`cancel` are the manual
// terminal paths.
export interface IAssetTransfersService {
  list(query?: AssetTransferListQuery): Promise<AssetTransferDto[]>
  get(id: string): Promise<AssetTransferDto>
  /** Resolve a scanned token to its transfer (receiver side, pre-accept). */
  byToken(token: string): Promise<AssetTransferDto>
  initiate(input: InitiateTransferRequest): Promise<AssetTransferDto>
  /** Receiver confirms by token → custody moves. */
  accept(input: AcceptTransferRequest): Promise<AssetTransferDto>
  /** Receiver declines a scanned transfer. */
  reject(id: string): Promise<AssetTransferDto>
  /** Initiator cancels their own pending transfer. */
  cancel(id: string): Promise<AssetTransferDto>
}
