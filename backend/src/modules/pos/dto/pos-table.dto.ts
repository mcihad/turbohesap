import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator'

import type {
  CreatePosFloorRequest,
  CreatePosTableRequest,
  UpdatePosFloorRequest,
  UpdatePosTableRequest,
} from '@turbohesap/shared'

export class CreatePosFloorDto implements CreatePosFloorRequest {
  @IsString() @IsNotEmpty() name!: string
  @IsOptional() @IsString() branchId?: string | null
  @IsOptional() @IsInt() sortOrder?: number
  @IsOptional() @IsBoolean() isActive?: boolean
}
export class UpdatePosFloorDto implements UpdatePosFloorRequest {
  @IsOptional() @IsString() @IsNotEmpty() name?: string
  @IsOptional() @IsString() branchId?: string | null
  @IsOptional() @IsInt() sortOrder?: number
  @IsOptional() @IsBoolean() isActive?: boolean
}

export class CreatePosTableDto implements CreatePosTableRequest {
  @IsString() @IsNotEmpty() floorId!: string
  @IsString() @IsNotEmpty() name!: string
  @IsOptional() @IsInt() @Min(0) seats?: number
  @IsOptional() @IsInt() posX?: number
  @IsOptional() @IsInt() posY?: number
  @IsOptional() @IsInt() sortOrder?: number
  @IsOptional() @IsBoolean() isActive?: boolean
}
export class UpdatePosTableDto implements UpdatePosTableRequest {
  @IsOptional() @IsString() floorId?: string
  @IsOptional() @IsString() @IsNotEmpty() name?: string
  @IsOptional() @IsInt() @Min(0) seats?: number
  @IsOptional() @IsInt() posX?: number
  @IsOptional() @IsInt() posY?: number
  @IsOptional() @IsInt() sortOrder?: number
  @IsOptional() @IsBoolean() isActive?: boolean
}
