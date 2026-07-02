import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator'

import type { UpdateCodePrefixRequest } from '@turbohesap/shared'

export class UpdateCodePrefixDto implements UpdateCodePrefixRequest {
  @IsOptional()
  @IsString()
  context?: string

  @IsOptional()
  @IsString()
  prefix?: string

  @IsOptional()
  @IsInt()
  @Min(1)
  padding?: number

  @IsOptional()
  @IsInt()
  @Min(1)
  nextNumber?: number

  @IsOptional()
  @IsBoolean()
  incrementOnSave?: boolean

  @IsOptional()
  @IsBoolean()
  isActive?: boolean

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number
}
