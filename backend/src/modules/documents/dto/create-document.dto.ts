import {
  Allow,
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator'

import type { CreateDocumentRequest } from '@turbohesap/shared'

export class CreateDocumentDto implements CreateDocumentRequest {
  @IsOptional()
  @IsUUID()
  categoryId?: string | null

  @IsString()
  @IsNotEmpty()
  title!: string

  @IsOptional()
  @IsString()
  code?: string

  @IsOptional()
  @IsString()
  description?: string

  // Free-form, schema-validated against the category's fieldDefs in the service.
  @IsOptional()
  @IsObject()
  @Allow()
  attributes?: Record<string, unknown>

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[]

  // Free-form, reserved for future OCR/processing pipelines.
  @IsOptional()
  @IsObject()
  @Allow()
  metadata?: Record<string, unknown>

  @IsOptional()
  @IsBoolean()
  isTimeBound?: boolean

  @IsOptional()
  @IsDateString()
  issueDate?: string | null

  @IsOptional()
  @IsDateString()
  expiryDate?: string | null

  @IsOptional()
  @IsInt()
  reminderDaysBefore?: number | null

  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean

  @IsOptional()
  @IsUUID()
  ownerId?: string | null

  @IsOptional()
  @IsString()
  relatedEntityType?: string | null

  @IsOptional()
  @IsUUID()
  relatedEntityId?: string | null
}
