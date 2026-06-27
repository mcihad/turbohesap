import { Type } from 'class-transformer'
import {
  Allow,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator'

import {
  CATEGORY_FIELD_TYPES,
  type CategoryFieldDef,
  type CategoryFieldType,
  type CreateCategoryRequest,
} from '@turbohesap/shared'

// One custom field definition (validated nested object). Every property is
// decorated because the global ValidationPipe runs with whitelist +
// forbidNonWhitelisted — undecorated props would be rejected.
export class CategoryFieldDefDto implements CategoryFieldDef {
  @IsString()
  @IsNotEmpty()
  key!: string

  @IsString()
  @IsNotEmpty()
  label!: string

  @IsIn(CATEGORY_FIELD_TYPES)
  type!: CategoryFieldType

  @IsBoolean()
  required!: boolean

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  options?: string[]

  @IsOptional()
  @IsString()
  lookupList?: string

  @IsOptional()
  @IsNumber()
  min?: number

  @IsOptional()
  @IsNumber()
  max?: number

  @IsOptional()
  @IsNumber()
  step?: number

  @IsOptional()
  @IsString()
  unit?: string

  @IsOptional()
  @IsString()
  currency?: string

  @IsOptional()
  @IsString()
  minDate?: string

  @IsOptional()
  @IsString()
  maxDate?: string

  // Union shape (string|number|boolean|string[]|null) — allow through.
  @IsOptional()
  @Allow()
  defaultValue?: string | number | boolean | string[] | null

  @IsOptional()
  @IsString()
  placeholder?: string

  @IsOptional()
  @IsString()
  helpText?: string

  @IsOptional()
  @IsInt()
  sortOrder?: number
}

export class CreateCategoryDto implements CreateCategoryRequest {
  @IsString()
  @IsNotEmpty()
  name!: string

  @IsOptional()
  @IsUUID()
  parentId?: string | null

  @IsOptional()
  @IsString()
  code?: string

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsString()
  imageUrl?: string

  @IsOptional()
  @IsBoolean()
  isActive?: boolean

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CategoryFieldDefDto)
  fieldDefs?: CategoryFieldDefDto[]
}
