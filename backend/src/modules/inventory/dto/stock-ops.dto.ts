import {
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator'
import { Type } from 'class-transformer'

import type {
  ReservationListQuery,
  ReservationStatus,
  ReserveStockRequest,
} from '@turbohesap/shared'

const RESERVATION_STATUSES: ReservationStatus[] = ['active', 'released', 'consumed']

export class ReserveStockDto implements ReserveStockRequest {
  @IsUUID()
  productId!: string

  @IsOptional()
  @IsUUID()
  variantId?: string | null

  @IsOptional()
  @IsUUID()
  branchId?: string | null

  @IsNumber()
  @IsPositive()
  quantity!: number

  @IsString()
  sourceModule!: string

  @IsUUID()
  sourceId!: string

  @IsOptional()
  @IsString()
  expiresAt?: string | null
}

export class ReleaseReservationDto {
  @IsString()
  sourceModule!: string

  @IsUUID()
  sourceId!: string
}

export class ReservationListQueryDto implements ReservationListQuery {
  @IsOptional()
  @IsString()
  sourceModule?: string

  @IsOptional()
  @IsUUID()
  sourceId?: string

  @IsOptional()
  @IsUUID()
  productId?: string

  @IsOptional()
  @IsIn(RESERVATION_STATUSES)
  status?: ReservationStatus
}

export class AvailabilityQueryDto {
  @IsUUID()
  productId!: string

  @IsOptional()
  @IsUUID()
  variantId?: string | null

  @IsOptional()
  @IsUUID()
  branchId?: string | null

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  horizonDays?: number
}

class AvailabilityUnitDto {
  @IsUUID()
  productId!: string

  @IsOptional()
  @IsUUID()
  variantId?: string
}

export class AvailabilityBulkDto {
  @ValidateNested({ each: true })
  @Type(() => AvailabilityUnitDto)
  units!: AvailabilityUnitDto[]

  @IsOptional()
  @IsUUID()
  branchId?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  horizonDays?: number
}

export class ProductCostQueryDto {
  @IsUUID()
  productId!: string

  @IsOptional()
  @IsUUID()
  variantId?: string | null

  @IsOptional()
  @IsUUID()
  branchId?: string | null
}
