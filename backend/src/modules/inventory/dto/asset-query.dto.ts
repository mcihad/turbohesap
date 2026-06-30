import { Transform } from 'class-transformer'
import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator'

import {
  ASSET_ASSIGNMENT_STATUS_LABELS,
  ASSET_MAINTENANCE_STATUS_LABELS,
  ASSET_MAINTENANCE_TYPE_LABELS,
  ASSET_STATUSES,
  ASSET_TRANSFER_STATUS_LABELS,
  ASSET_VEHICLE_LOG_KIND_LABELS,
  type AssetAssignmentListQuery,
  type AssetAssignmentStatus,
  type AssetListQuery,
  type AssetMaintenanceListQuery,
  type AssetMaintenanceStatus,
  type AssetMaintenanceType,
  type AssetStatus,
  type AssetTransferListQuery,
  type AssetTransferStatus,
  type AssetVehicleLogKind,
  type AssetVehicleLogListQuery,
} from '@turbohesap/shared'

// Parse a query-string boolean ("true"/"false") into a real boolean.
const toBool = () =>
  Transform(({ value }) =>
    value === undefined ? undefined : value === true || value === 'true',
  )

export class AssetListQueryDto implements AssetListQuery {
  @IsOptional()
  @IsIn(ASSET_STATUSES)
  status?: AssetStatus

  @IsOptional()
  @IsString()
  assetTypeKey?: string

  @IsOptional()
  @IsString()
  branchId?: string

  @IsOptional()
  @IsString()
  employeeId?: string

  @IsOptional()
  @toBool()
  @IsBoolean()
  isVehicle?: boolean

  @IsOptional()
  @IsString()
  search?: string
}

export class AssetAssignmentListQueryDto implements AssetAssignmentListQuery {
  @IsOptional()
  @IsString()
  assetId?: string

  @IsOptional()
  @IsString()
  employeeId?: string

  @IsOptional()
  @IsIn(Object.keys(ASSET_ASSIGNMENT_STATUS_LABELS))
  status?: AssetAssignmentStatus
}

export class AssetTransferListQueryDto implements AssetTransferListQuery {
  @IsOptional()
  @IsString()
  assetId?: string

  @IsOptional()
  @IsIn(Object.keys(ASSET_TRANSFER_STATUS_LABELS))
  status?: AssetTransferStatus

  @IsOptional()
  @toBool()
  @IsBoolean()
  mine?: boolean
}

export class AssetMaintenanceListQueryDto implements AssetMaintenanceListQuery {
  @IsOptional()
  @IsString()
  assetId?: string

  @IsOptional()
  @IsIn(Object.keys(ASSET_MAINTENANCE_TYPE_LABELS))
  type?: AssetMaintenanceType

  @IsOptional()
  @IsIn(Object.keys(ASSET_MAINTENANCE_STATUS_LABELS))
  status?: AssetMaintenanceStatus
}

export class AssetVehicleLogListQueryDto implements AssetVehicleLogListQuery {
  @IsOptional()
  @IsString()
  assetId?: string

  @IsOptional()
  @IsIn(Object.keys(ASSET_VEHICLE_LOG_KIND_LABELS))
  kind?: AssetVehicleLogKind
}
