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
  DOCUMENT_FIELD_TYPES,
  type CreateDocumentCategoryRequest,
  type DocumentFieldDef,
  type DocumentFieldType,
} from '@turbohesap/shared'

// One custom field definition (validated nested object) — every property is
// decorated because the global ValidationPipe runs with whitelist +
// forbidNonWhitelisted.
export class DocumentFieldDefDto implements DocumentFieldDef {
  @IsString()
  @IsNotEmpty()
  key!: string

  @IsString()
  @IsNotEmpty()
  label!: string

  @IsIn(DOCUMENT_FIELD_TYPES)
  type!: DocumentFieldType

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

export class CreateDocumentCategoryDto implements CreateDocumentCategoryRequest {
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
  @IsBoolean()
  isActive?: boolean

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number

  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean

  @IsOptional()
  @IsUUID()
  ownerId?: string | null

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DocumentFieldDefDto)
  fieldDefs?: DocumentFieldDefDto[]
}
