import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator'

import type { CreateCodePrefixRequest } from '@turbohesap/shared'

export class CreateCodePrefixDto implements CreateCodePrefixRequest {
  @IsString()
  @IsNotEmpty()
  context!: string

  @IsString()
  @IsNotEmpty()
  prefix!: string

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
