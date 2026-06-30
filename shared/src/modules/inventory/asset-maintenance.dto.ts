// Bakım/Onarım — the maintenance & repair ledger for a demirbaş (incl. vehicles).
// Each record captures the work, cost, vendor, and (for vehicles) the odometer,
// plus the next-due date/odometer so upcoming service can be surfaced.
import type { AssetSummary } from './asset.dto'

export type AssetMaintenanceType =
  | 'bakim' // periyodik bakım
  | 'onarim' // arıza onarımı
  | 'muayene' // muayene/inceleme
  | 'lastik' // lastik değişimi (araç)
  | 'diger'

export const ASSET_MAINTENANCE_TYPE_LABELS: Record<AssetMaintenanceType, string> = {
  bakim: 'Bakım',
  onarim: 'Onarım',
  muayene: 'Muayene',
  lastik: 'Lastik',
  diger: 'Diğer',
}

export type AssetMaintenanceStatus = 'planlandi' | 'devam' | 'tamamlandi' | 'iptal'

export const ASSET_MAINTENANCE_STATUS_LABELS: Record<AssetMaintenanceStatus, string> = {
  planlandi: 'Planlandı',
  devam: 'Devam ediyor',
  tamamlandi: 'Tamamlandı',
  iptal: 'İptal',
}

export interface AssetMaintenanceDto {
  id: string
  assetId: string
  asset: AssetSummary | null
  type: AssetMaintenanceType
  status: AssetMaintenanceStatus
  date: string
  cost: number
  currency: string
  /** Servicing vendor — links to a contacts (cari) row. */
  vendorContactId: string | null
  /** Odometer at service time (vehicles). */
  odometer: number | null
  description: string | null
  nextDueDate: string | null
  nextDueOdometer: number | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateAssetMaintenanceRequest {
  assetId: string
  type: AssetMaintenanceType
  date: string
  status?: AssetMaintenanceStatus
  cost?: number
  currency?: string
  vendorContactId?: string | null
  odometer?: number | null
  description?: string | null
  nextDueDate?: string | null
  nextDueOdometer?: number | null
  notes?: string | null
}

export type UpdateAssetMaintenanceRequest = Partial<
  Omit<CreateAssetMaintenanceRequest, 'assetId'>
>

export interface AssetMaintenanceListQuery {
  assetId?: string
  type?: AssetMaintenanceType
  status?: AssetMaintenanceStatus
}
