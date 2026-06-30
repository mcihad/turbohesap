import { PartialType } from '@nestjs/swagger'
import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator'

import {
  ASSET_MAINTENANCE_STATUS_LABELS,
  ASSET_MAINTENANCE_TYPE_LABELS,
  type AssetMaintenanceStatus,
  type AssetMaintenanceType,
  type CreateAssetMaintenanceRequest,
  type UpdateAssetMaintenanceRequest,
} from '@turbohesap/shared'

const MAINTENANCE_TYPES = Object.keys(
  ASSET_MAINTENANCE_TYPE_LABELS,
) as AssetMaintenanceType[]
const MAINTENANCE_STATUSES = Object.keys(
  ASSET_MAINTENANCE_STATUS_LABELS,
) as AssetMaintenanceStatus[]

export class CreateAssetMaintenanceDto implements CreateAssetMaintenanceRequest {
  @IsUUID()
  assetId!: string

  @IsIn(MAINTENANCE_TYPES)
  type!: AssetMaintenanceType

  @IsString()
  date!: string

  @IsOptional()
  @IsIn(MAINTENANCE_STATUSES)
  status?: AssetMaintenanceStatus

  @IsOptional()
  @IsNumber()
  @Min(0)
  cost?: number

  @IsOptional()
  @IsString()
  currency?: string

  @IsOptional()
  @IsUUID()
  vendorContactId?: string | null

  @IsOptional()
  @IsNumber()
  @Min(0)
  odometer?: number | null

  @IsOptional()
  @IsString()
  description?: string | null

  @IsOptional()
  @IsString()
  nextDueDate?: string | null

  @IsOptional()
  @IsNumber()
  @Min(0)
  nextDueOdometer?: number | null

  @IsOptional()
  @IsString()
  notes?: string | null
}

export class UpdateAssetMaintenanceDto
  extends PartialType(CreateAssetMaintenanceDto)
  implements UpdateAssetMaintenanceRequest {}
