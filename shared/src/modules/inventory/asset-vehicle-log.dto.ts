// Araç KM & Yakıt — the usage ledger for vehicle assets. A `yakit` record logs a
// fuel purchase (liters/cost) with the odometer; a `km` record is an
// odometer-only reading. The asset's `currentOdometer` is derived as the max
// odometer across its logs. `driverEmployeeId` captures who used the vehicle.
import type { AssetSummary } from './asset.dto'

export type AssetVehicleLogKind = 'yakit' | 'km'

export const ASSET_VEHICLE_LOG_KIND_LABELS: Record<AssetVehicleLogKind, string> = {
  yakit: 'Yakıt',
  km: 'KM',
}

export interface AssetVehicleLogDto {
  id: string
  assetId: string
  asset: AssetSummary | null
  kind: AssetVehicleLogKind
  date: string
  odometer: number
  // Fuel-specific (null for km-only readings).
  liters: number | null
  unitPrice: number | null
  totalCost: number | null
  currency: string
  fuelTypeKey: string | null
  isFull: boolean
  station: string | null
  /** Driver/user — the personel who used the vehicle. */
  driverEmployeeId: string | null
  driverEmployeeName: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateAssetVehicleLogRequest {
  assetId: string
  kind: AssetVehicleLogKind
  date: string
  odometer: number
  liters?: number | null
  unitPrice?: number | null
  totalCost?: number | null
  currency?: string
  fuelTypeKey?: string | null
  isFull?: boolean
  station?: string | null
  driverEmployeeId?: string | null
  notes?: string | null
}

export type UpdateAssetVehicleLogRequest = Partial<
  Omit<CreateAssetVehicleLogRequest, 'assetId'>
>

export interface AssetVehicleLogListQuery {
  assetId?: string
  kind?: AssetVehicleLogKind
}
