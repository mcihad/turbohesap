import { PartialType } from '@nestjs/swagger'
import {
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator'

import {
  ASSET_VEHICLE_LOG_KIND_LABELS,
  type AssetVehicleLogKind,
  type CreateAssetVehicleLogRequest,
  type UpdateAssetVehicleLogRequest,
} from '@turbohesap/shared'

const LOG_KINDS = Object.keys(
  ASSET_VEHICLE_LOG_KIND_LABELS,
) as AssetVehicleLogKind[]

export class CreateAssetVehicleLogDto implements CreateAssetVehicleLogRequest {
  @IsUUID()
  assetId!: string

  @IsIn(LOG_KINDS)
  kind!: AssetVehicleLogKind

  @IsString()
  date!: string

  @IsNumber()
  @Min(0)
  odometer!: number

  @IsOptional()
  @IsNumber()
  @Min(0)
  liters?: number | null

  @IsOptional()
  @IsNumber()
  @Min(0)
  unitPrice?: number | null

  @IsOptional()
  @IsNumber()
  @Min(0)
  totalCost?: number | null

  @IsOptional()
  @IsString()
  currency?: string

  @IsOptional()
  @IsString()
  fuelTypeKey?: string | null

  @IsOptional()
  @IsBoolean()
  isFull?: boolean

  @IsOptional()
  @IsString()
  station?: string | null

  @IsOptional()
  @IsUUID()
  driverEmployeeId?: string | null

  @IsOptional()
  @IsString()
  notes?: string | null
}

export class UpdateAssetVehicleLogDto
  extends PartialType(CreateAssetVehicleLogDto)
  implements UpdateAssetVehicleLogRequest {}
