import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator'

import type { UpdateLookupItemRequest } from '@turbohesap/shared'

export class UpdateLookupItemDto implements UpdateLookupItemRequest {
  @IsOptional()
  @IsString()
  list?: string

  @IsOptional()
  @IsString()
  key?: string

  @IsOptional()
  @IsString()
  value?: string

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number

  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}
