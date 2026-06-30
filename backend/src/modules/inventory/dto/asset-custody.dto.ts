import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator'

import type {
  AcceptTransferRequest,
  AssignAssetRequest,
  InitiateTransferRequest,
  ReturnAssetRequest,
} from '@turbohesap/shared'

// Zimmet ver — assign an asset to a personel.
export class AssignAssetDto implements AssignAssetRequest {
  @IsUUID()
  assetId!: string

  @IsUUID()
  employeeId!: string

  @IsOptional()
  @IsString()
  notes?: string | null
}

// Zimmet iade — return an asset.
export class ReturnAssetDto implements ReturnAssetRequest {
  @IsOptional()
  @IsUUID()
  branchId?: string | null

  @IsOptional()
  @IsString()
  note?: string | null
}

// Devret — start a custody transfer (barcode handshake).
export class InitiateTransferDto implements InitiateTransferRequest {
  @IsUUID()
  assetId!: string

  @IsOptional()
  @IsUUID()
  toEmployeeId?: string | null

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20160) // up to 14 days
  expiresInMinutes?: number

  @IsOptional()
  @IsString()
  notes?: string | null
}

// Devral — accept a transfer by its scanned token.
export class AcceptTransferDto implements AcceptTransferRequest {
  @IsString()
  token!: string
}
