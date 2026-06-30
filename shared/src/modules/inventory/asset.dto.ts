// Demirbaş (Fixed Asset) — an item the business owns and tracks: equipment,
// machinery, vehicles, computers, furniture. Unlike products, an asset is a
// single tracked unit (not stock-on-hand): it has a lifecycle status, an optional
// current custodian (a personel it is assigned to — see asset-assignment.dto), and
// for vehicles a set of extra fields (plate, chassis, odometer, fuel). Asset
// **types** come from the lookups list `asset_type`; vehicle fuel from `fuel_type`.
// No depreciation/amortisman in this version — only the purchase value is kept.

// Lifecycle status. `depoda` = in stock / available; `zimmetli` = assigned to a
// personel; `bakimda` = under maintenance; `kayip` = lost; `hurda` = scrapped;
// `cikis` = disposed/removed from inventory; `pasif` = inactive/retired.
export type AssetStatus =
  | 'depoda'
  | 'zimmetli'
  | 'bakimda'
  | 'kayip'
  | 'hurda'
  | 'cikis'
  | 'pasif'

export const ASSET_STATUSES: AssetStatus[] = [
  'depoda',
  'zimmetli',
  'bakimda',
  'kayip',
  'hurda',
  'cikis',
  'pasif',
]

export const ASSET_STATUS_LABELS: Record<AssetStatus, string> = {
  depoda: 'Depoda',
  zimmetli: 'Zimmetli',
  bakimda: 'Bakımda',
  kayip: 'Kayıp',
  hurda: 'Hurda',
  cikis: 'Çıkış',
  pasif: 'Pasif',
}

// Statuses that take an asset out of active service; moving to one of these
// auto-closes any active zimmet (custody assignment).
export const ASSET_RETIRED_STATUSES: AssetStatus[] = ['kayip', 'hurda', 'cikis', 'pasif']

export interface AssetDto {
  id: string
  /** Human/printed code (unique). */
  code: string
  name: string
  /** Asset type key from the lookups list `asset_type` (araç/makine/teçhizat…). */
  assetTypeKey: string | null
  /** Own barcode/QR for scanning/identification (unique when set). */
  barcode: string | null
  serialNo: string | null
  brand: string | null
  model: string | null

  // Acquisition (no depreciation in this version).
  purchaseDate: string | null
  purchaseValue: number
  currency: string
  /** Supplier — links to a contacts (cari) row. */
  supplierContactId: string | null
  warrantyEnd: string | null

  /** Location branch (org). */
  branchId: string | null

  status: AssetStatus
  statusReason: string | null
  statusNote: string | null
  statusChangedAt: string | null

  /** Current custodian (denormalized for fast "kimde?" lookup). */
  currentEmployeeId: string | null
  currentEmployeeName: string | null
  /** The active assignment id, if zimmetli. */
  currentAssignmentId: string | null

  // Vehicle fields (only meaningful when isVehicle).
  isVehicle: boolean
  plate: string | null
  chassisNo: string | null
  engineNo: string | null
  modelYear: number | null
  fuelTypeKey: string | null
  /** Latest odometer reading, derived from the vehicle logs. */
  currentOdometer: number | null

  notes: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// Compact reference for embedding (assignments, transfers, maintenance, pickers).
export interface AssetSummary {
  id: string
  code: string
  name: string
  assetTypeKey: string | null
  status: AssetStatus
  isVehicle: boolean
  plate: string | null
}

export interface CreateAssetRequest {
  name: string
  code?: string
  assetTypeKey?: string | null
  barcode?: string | null
  serialNo?: string | null
  brand?: string | null
  model?: string | null
  purchaseDate?: string | null
  purchaseValue?: number
  currency?: string
  supplierContactId?: string | null
  warrantyEnd?: string | null
  branchId?: string | null
  isVehicle?: boolean
  plate?: string | null
  chassisNo?: string | null
  engineNo?: string | null
  modelYear?: number | null
  fuelTypeKey?: string | null
  notes?: string | null
  isActive?: boolean
}

export type UpdateAssetRequest = Partial<CreateAssetRequest>

// Lifecycle status change (giriş/çıkış, kayıp, hurda, pasif…). Going to a retired
// status auto-closes the active zimmet.
export interface ChangeAssetStatusRequest {
  status: AssetStatus
  reason?: string | null
  note?: string | null
  /** Effective date of the change (defaults to now). */
  date?: string | null
}

// List filters.
export interface AssetListQuery {
  status?: AssetStatus
  assetTypeKey?: string
  branchId?: string
  employeeId?: string
  isVehicle?: boolean
  search?: string
}
