// Zimmet devri (custody transfer) — a two-step barcode handshake, primarily a
// mobile flow:
//   1) The current holder taps "Devret" → a `pending` transfer + a random `token`
//      is created; the app renders the token as a QR/barcode.
//   2) The receiver scans the QR (resolves the transfer `byToken`), reviews the
//      asset + giver, then taps "Devraldım" → `accept`: the giver's active zimmet
//      is closed (`transferred`), a new active zimmet opens for the receiver, and
//      the asset's current custodian flips. reject/cancel/expire are the other
//      terminal states.
import type { AssetSummary } from './asset.dto'

export type AssetTransferStatus =
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'cancelled'
  | 'expired'

export const ASSET_TRANSFER_STATUS_LABELS: Record<AssetTransferStatus, string> = {
  pending: 'Bekliyor',
  accepted: 'Devralındı',
  rejected: 'Reddedildi',
  cancelled: 'İptal edildi',
  expired: 'Süresi doldu',
}

export interface AssetTransferDto {
  id: string
  assetId: string
  asset: AssetSummary | null
  status: AssetTransferStatus
  /** Personel handing the asset over (the current holder). */
  fromEmployeeId: string | null
  fromEmployeeName: string | null
  /** Optional pre-selected target personel; null = whoever accepts. */
  toEmployeeId: string | null
  toEmployeeName: string | null
  /** The personel who actually accepted (devralan). */
  acceptedByEmployeeId: string | null
  acceptedByEmployeeName: string | null
  initiatedById: string | null
  initiatedByName: string | null
  /** Random token embedded in the QR/barcode. Only returned to authorized callers. */
  token: string
  expiresAt: string | null
  acceptedAt: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

// Holder starts a transfer of an asset they currently hold.
export interface InitiateTransferRequest {
  assetId: string
  /** Optional: restrict who may accept to this personel. */
  toEmployeeId?: string | null
  /** Minutes until the token expires (default server-side). */
  expiresInMinutes?: number
  notes?: string | null
}

// Receiver confirms "Devraldım" by token (the scanned QR payload).
export interface AcceptTransferRequest {
  token: string
}

export interface AssetTransferListQuery {
  assetId?: string
  status?: AssetTransferStatus
  /** Only transfers initiated by / targeted at the current user's personel. */
  mine?: boolean
}
