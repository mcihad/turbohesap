import { Type } from 'class-transformer'
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator'

import {
  STAGE_TYPES,
  type CreatePipelineRequest,
  type CreatePipelineStageRequest,
  type ReorderStagesRequest,
  type StageType,
  type UpdatePipelineRequest,
  type UpdatePipelineStageRequest,
} from '@turbohesap/shared'

export class CreatePipelineStageDto implements CreatePipelineStageRequest {
  @IsString() @IsNotEmpty() name!: string
  @IsOptional() @IsString() key?: string
  @IsOptional() @IsInt() sortOrder?: number
  @IsOptional() @IsNumber() @Min(0) @Max(100) probability?: number
  @IsOptional() @IsIn(STAGE_TYPES) type?: StageType
  @IsOptional() @IsInt() @Min(0) rottingDays?: number
  @IsOptional() @IsString() color?: string
}

export class UpdatePipelineStageDto implements UpdatePipelineStageRequest {
  @IsOptional() @IsString() @IsNotEmpty() name?: string
  @IsOptional() @IsString() key?: string
  @IsOptional() @IsInt() sortOrder?: number
  @IsOptional() @IsNumber() @Min(0) @Max(100) probability?: number
  @IsOptional() @IsIn(STAGE_TYPES) type?: StageType
  @IsOptional() @IsInt() @Min(0) rottingDays?: number
  @IsOptional() @IsString() color?: string
}

export class CreatePipelineDto implements CreatePipelineRequest {
  @IsString() @IsNotEmpty() name!: string
  @IsOptional() @IsString() description?: string
  @IsOptional() @IsBoolean() isDefault?: boolean
  @IsOptional() @IsBoolean() isActive?: boolean
  @IsOptional() @IsInt() sortOrder?: number
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePipelineStageDto)
  stages?: CreatePipelineStageDto[]
}

export class UpdatePipelineDto implements UpdatePipelineRequest {
  @IsOptional() @IsString() @IsNotEmpty() name?: string
  @IsOptional() @IsString() description?: string
  @IsOptional() @IsBoolean() isDefault?: boolean
  @IsOptional() @IsBoolean() isActive?: boolean
  @IsOptional() @IsInt() sortOrder?: number
}

export class ReorderStagesDto implements ReorderStagesRequest {
  @IsArray() @IsString({ each: true }) stageIds!: string[]
}
