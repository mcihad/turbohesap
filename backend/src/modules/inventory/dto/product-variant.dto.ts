import { PartialType } from '@nestjs/swagger'
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
} from 'class-validator'

import type {
  CreateProductVariantRequest,
  GenerateVariantsRequest,
  UpdateProductVariantRequest,
} from '@turbohesap/shared'

export class CreateProductVariantDto implements CreateProductVariantRequest {
  // { Renk: "Kırmızı", Beden: "M" } — keyed by attribute name.
  @IsObject()
  @IsNotEmpty()
  attributeValues!: Record<string, string>

  @IsOptional()
  @IsString()
  code?: string

  @IsOptional()
  @IsString()
  barcode?: string

  @IsOptional()
  @IsNumber()
  priceExtra?: number

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
  @IsString()
  imageUrl?: string

  @IsOptional()
  @IsInt()
  sortOrder?: number
}

export class UpdateProductVariantDto
  extends PartialType(CreateProductVariantDto)
  implements UpdateProductVariantRequest {}

export class GenerateVariantsDto implements GenerateVariantsRequest {
  @IsOptional()
  @IsBoolean()
  pruneInvalid?: boolean
}
