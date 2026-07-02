import { PartialType } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator'

import type {
  BomByproductInput,
  BomComponentInput,
  BomOperationInput,
  BomType,
  ComponentConsumptionType,
  ConsumptionPolicy,
  CreateBomRequest,
  OperationTimeBasis,
  UpdateBomRequest,
} from '@turbohesap/shared'

const BOM_TYPES: BomType[] = ['manufacture', 'phantom', 'subcontract']
const POLICIES: ConsumptionPolicy[] = ['strict', 'warn', 'flexible']

export class BomComponentInputDto implements BomComponentInput {
  @IsUUID() componentProductId!: string
  @IsOptional() @IsUUID() componentVariantId?: string | null
  @IsNumber() @Min(0) quantity!: number
  @IsOptional() @IsString() unit?: string
  @IsOptional() @IsNumber() @Min(0) scrapRate?: number
  @IsOptional() @IsInt() operationRef?: number | null
  @IsOptional() @IsIn(['auto', 'manual']) consumptionType?: ComponentConsumptionType
  @IsOptional() @IsBoolean() isOptional?: boolean
  @IsOptional() @IsUUID() applyOnVariantId?: string | null
  @IsOptional() @IsString() notes?: string | null
  @IsOptional() @IsInt() sortOrder?: number
}

export class BomByproductInputDto implements BomByproductInput {
  @IsUUID() productId!: string
  @IsOptional() @IsUUID() variantId?: string | null
  @IsNumber() @Min(0) quantity!: number
  @IsOptional() @IsString() unit?: string
  @IsOptional() @IsNumber() @Min(0) costShareRate?: number
  @IsOptional() @IsInt() sortOrder?: number
}

export class BomOperationInputDto implements BomOperationInput {
  @IsInt() sequence!: number
  @IsString() name!: string
  @IsUUID() workCenterId!: string
  @IsOptional() @IsNumber() @Min(0) setupTimeMinutes?: number
  @IsOptional() @IsNumber() @Min(0) timePerUnitMinutes?: number
  @IsOptional() @IsIn(['per_unit', 'fixed']) timeBasis?: OperationTimeBasis
  @IsOptional() @IsString() instructions?: string | null
  @IsOptional() @IsBoolean() qualityCheckRequired?: boolean
  @IsOptional() @IsInt() sortOrder?: number
}

export class CreateBomDto implements CreateBomRequest {
  @IsUUID() productId!: string
  @IsOptional() @IsUUID() variantId?: string | null
  @IsOptional() @IsString() code?: string
  @IsOptional() @IsString() name?: string
  @IsOptional() @IsIn(BOM_TYPES) type?: BomType
  @IsOptional() @IsNumber() @Min(0.0001) outputQuantity?: number
  @IsOptional() @IsString() unit?: string
  @IsOptional() @IsString() revision?: string | null
  @IsOptional() @IsString() validFrom?: string | null
  @IsOptional() @IsString() validTo?: string | null
  @IsOptional() @IsIn(POLICIES) consumptionPolicy?: ConsumptionPolicy
  @IsOptional() @IsNumber() @Min(0) manufLeadTimeDays?: number | null
  @IsOptional() @IsBoolean() isActive?: boolean
  @IsOptional() @IsString() notes?: string | null

  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => BomComponentInputDto)
  components?: BomComponentInputDto[]

  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => BomByproductInputDto)
  byproducts?: BomByproductInputDto[]

  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => BomOperationInputDto)
  operations?: BomOperationInputDto[]
}

export class UpdateBomDto extends PartialType(CreateBomDto) implements UpdateBomRequest {}
