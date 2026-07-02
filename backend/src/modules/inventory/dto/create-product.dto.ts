import { Type } from 'class-transformer'
import {
  Allow,
  IsArray,
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator'

import {
  PRODUCT_TYPES,
  type CreateProductRequest,
  type ProductType,
  type VariantAttribute,
} from '@turbohesap/shared'

// One variant axis, e.g. { name: "Renk", values: ["Kırmızı", "Mavi"] }.
export class VariantAttributeInput implements VariantAttribute {
  @IsString()
  @IsNotEmpty()
  name!: string

  @IsOptional()
  @IsString()
  lookupList?: string

  @IsArray()
  @IsString({ each: true })
  values!: string[]
}

export class CreateProductDto implements CreateProductRequest {
  @IsString()
  @IsNotEmpty()
  code!: string

  @IsString()
  @IsNotEmpty()
  name!: string

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsString()
  barcode?: string

  @IsOptional()
  @IsString()
  brand?: string

  @IsOptional()
  @IsIn(PRODUCT_TYPES)
  type?: ProductType

  @IsOptional()
  @IsBoolean()
  trackStock?: boolean

  @IsOptional()
  @IsBoolean()
  canBeSold?: boolean

  @IsOptional()
  @IsBoolean()
  canBePurchased?: boolean

  @IsOptional()
  @IsBoolean()
  canBeManufactured?: boolean

  @IsOptional()
  @IsUUID()
  categoryId?: string | null

  @IsOptional()
  @IsString()
  unit?: string

  @IsOptional()
  @IsBoolean()
  hasVariants?: boolean

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VariantAttributeInput)
  variantAttributes?: VariantAttributeInput[]

  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsNumber()
  @Min(0)
  purchasePrice?: number | null

  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsNumber()
  @Min(0)
  salePrice?: number | null

  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsNumber()
  @Min(0)
  taxRate?: number | null

  @IsOptional()
  @IsString()
  currency?: string

  @IsOptional()
  @IsNumber()
  quantity?: number

  @IsOptional()
  @IsNumber()
  minQuantity?: number

  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsNumber()
  @Min(0)
  weight?: number | null

  @IsOptional()
  @IsString()
  imageUrl?: string

  @IsOptional()
  @IsBoolean()
  isActive?: boolean

  // Free-form custom attribute values (validated against the category's fieldDefs
  // by the dynamic form later); accept any object here.
  @IsOptional()
  @IsObject()
  @Allow()
  attributes?: Record<string, unknown>

  // Optional per-branch opening stock.
  @IsOptional()
  @IsArray()
  @Allow()
  stocks?: { branchId: string | null; quantity: number }[]
}
