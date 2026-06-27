import { PartialType } from '@nestjs/swagger'
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateIf,
} from 'class-validator'

import type {
  CreateProductPackagingRequest,
  UpdateProductPackagingRequest,
} from '@turbohesap/shared'

export class CreateProductPackagingDto
  implements CreateProductPackagingRequest
{
  @IsString()
  @IsNotEmpty()
  name!: string

  // The multiplier — how many base units this pack holds (e.g. 6).
  @IsNumber()
  @Min(0)
  quantity!: number

  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsUUID()
  variantId?: string | null

  @IsOptional()
  @IsString()
  unit?: string

  @IsOptional()
  @IsString()
  barcode?: string

  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsNumber()
  @Min(0)
  salePrice?: number | null

  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsNumber()
  @Min(0)
  purchasePrice?: number | null

  @IsOptional()
  @IsBoolean()
  isActive?: boolean

  @IsOptional()
  @IsInt()
  sortOrder?: number
}

export class UpdateProductPackagingDto
  extends PartialType(CreateProductPackagingDto)
  implements UpdateProductPackagingRequest {}
