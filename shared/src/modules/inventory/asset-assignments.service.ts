import type {
  AssetAssignmentDto,
  AssetAssignmentListQuery,
  AssignAssetRequest,
  ReturnAssetRequest,
} from './asset-assignment.dto'

// Zimmet (custody) operations + ledger. `mine()` returns the active assignments
// for the calling user's linked personel (Employee.userId) — powers the mobile
// "Zimmetlerim" screen and the devir flow.
export interface IAssetAssignmentsService {
  list(query?: AssetAssignmentListQuery): Promise<AssetAssignmentDto[]>
  /** Active assignments for the current user's linked personel. */
  mine(): Promise<AssetAssignmentDto[]>
  /** Assign an asset to a personel (opens an active assignment). */
  assign(input: AssignAssetRequest): Promise<AssetAssignmentDto>
  /** Return an asset by its id (closes the active assignment). */
  returnAsset(assetId: string, input?: ReturnAssetRequest): Promise<AssetAssignmentDto>
}
