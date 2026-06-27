import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator'

import type { CreateLookupItemRequest } from '@turbohesap/shared'

export class CreateLookupItemDto implements CreateLookupItemRequest {
  @IsString()
  @IsNotEmpty()
  list!: string

  @IsString()
  @IsNotEmpty()
  value!: string

  // Optional; the service derives a slug from `value` when omitted.
  @IsOptional()
  @IsString()
  key?: string

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number

  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}
