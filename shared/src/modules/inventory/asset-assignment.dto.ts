// Zimmet (custody) ledger — the history of who held a demirbaş. The **active**
// assignment (status `active`) is the current custodian; assigning/returning/
// transferring opens or closes rows. A transfer (see asset-transfer.dto) closes
// the giver's active row (`transferred`) and opens a new `active` row for the
// receiver.
import type { AssetSummary } from './asset.dto'

export type AssetAssignmentStatus = 'active' | 'returned' | 'transferred'

export const ASSET_ASSIGNMENT_STATUS_LABELS: Record<AssetAssignmentStatus, string> = {
  active: 'Aktif',
  returned: 'İade edildi',
  transferred: 'Devredildi',
}

export interface AssetAssignmentDto {
  id: string
  assetId: string
  /** Compact asset reference (on list/get). */
  asset: AssetSummary | null
  /** The personel (HR employee) the asset is/was assigned to. */
  employeeId: string
  employeeName: string
  status: AssetAssignmentStatus
  assignedById: string | null
  assignedByName: string | null
  assignedAt: string
  returnedAt: string | null
  /** When closed by a transfer handshake, the transfer that did it. */
  transferId: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

// Give an asset to a personel (opens an active assignment; closes any prior one).
export interface AssignAssetRequest {
  assetId: string
  employeeId: string
  notes?: string | null
}

// Return an asset (closes the active assignment → asset back to `depoda`).
export interface ReturnAssetRequest {
  /** Optional new location branch on return. */
  branchId?: string | null
  note?: string | null
}

export interface AssetAssignmentListQuery {
  assetId?: string
  employeeId?: string
  status?: AssetAssignmentStatus
}
