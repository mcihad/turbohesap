import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator'

import { PartialType } from '@nestjs/swagger'

import {
  ASSET_STATUSES,
  type AssetStatus,
  type ChangeAssetStatusRequest,
  type CreateAssetRequest,
  type UpdateAssetRequest,
} from '@turbohesap/shared'

export class CreateAssetDto implements CreateAssetRequest {
  @IsString()
  @IsNotEmpty()
  name!: string

  @IsOptional()
  @IsString()
  code?: string

  @IsOptional()
  @IsString()
  assetTypeKey?: string | null

  @IsOptional()
  @IsString()
  barcode?: string | null

  @IsOptional()
  @IsString()
  serialNo?: string | null

  @IsOptional()
  @IsString()
  brand?: string | null

  @IsOptional()
  @IsString()
  model?: string | null

  @IsOptional()
  @IsString()
  purchaseDate?: string | null

  @IsOptional()
  @IsNumber()
  @Min(0)
  purchaseValue?: number

  @IsOptional()
  @IsString()
  currency?: string

  @IsOptional()
  @IsUUID()
  supplierContactId?: string | null

  @IsOptional()
  @IsString()
  warrantyEnd?: string | null

  @IsOptional()
  @IsUUID()
  branchId?: string | null

  @IsOptional()
  @IsBoolean()
  isVehicle?: boolean

  @IsOptional()
  @IsString()
  plate?: string | null

  @IsOptional()
  @IsString()
  chassisNo?: string | null

  @IsOptional()
  @IsString()
  engineNo?: string | null

  @IsOptional()
  @IsInt()
  modelYear?: number | null

  @IsOptional()
  @IsString()
  fuelTypeKey?: string | null

  @IsOptional()
  @IsString()
  notes?: string | null

  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}

// Update is a partial of create (every field optional).
export class UpdateAssetDto
  extends PartialType(CreateAssetDto)
  implements UpdateAssetRequest {}

export class ChangeAssetStatusDto implements ChangeAssetStatusRequest {
  @IsIn(ASSET_STATUSES)
  status!: AssetStatus

  @IsOptional()
  @IsString()
  reason?: string | null

  @IsOptional()
  @IsString()
  note?: string | null

  @IsOptional()
  @IsString()
  date?: string | null
}
