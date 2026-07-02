import { PartialType } from '@nestjs/swagger'
import { Transform } from 'class-transformer'
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator'

import type {
  CreateWorkCenterRequest,
  UpdateWorkCenterRequest,
  WorkCenterListQuery,
} from '@turbohesap/shared'

export class CreateWorkCenterDto implements CreateWorkCenterRequest {
  @IsOptional() @IsString() code?: string
  @IsString() @IsNotEmpty() name!: string
  @IsOptional() @IsUUID() branchId?: string | null
  @IsOptional() @IsNumber() @Min(0) costPerHour?: number
  @IsOptional() @IsNumber() @Min(0) setupCostPerHour?: number | null
  @IsOptional() @IsString() currency?: string
  @IsOptional() @IsNumber() @Min(0) capacityPerHour?: number | null
  @IsOptional() @IsInt() @Min(1) parallelCapacity?: number
  @IsOptional() @IsNumber() @Min(0) efficiencyRate?: number
  @IsOptional() @IsNumber() @Min(0) setupTimeMinutes?: number
  @IsOptional() @IsNumber() @Min(0) cleanupTimeMinutes?: number
  @IsOptional() @IsUUID() alternateWorkCenterId?: string | null
  @IsOptional() @IsString() costAccountCode?: string | null
  @IsOptional() @IsBoolean() isActive?: boolean
  @IsOptional() @IsString() notes?: string | null
}

export class UpdateWorkCenterDto
  extends PartialType(CreateWorkCenterDto)
  implements UpdateWorkCenterRequest {}

export class WorkCenterListQueryDto implements WorkCenterListQuery {
  @IsOptional() @IsString() branchId?: string
  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : value === true || value === 'true'))
  @IsBoolean()
  isActive?: boolean
}
