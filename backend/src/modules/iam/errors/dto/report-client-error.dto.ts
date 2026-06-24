import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator'

import type { ReportClientErrorRequest } from '@turbohesap/shared'

export class ReportClientErrorDto implements ReportClientErrorRequest {
  @IsString()
  @IsNotEmpty()
  message!: string

  @IsOptional()
  @IsString()
  exceptionType?: string

  @IsOptional()
  @IsString()
  stackTrace?: string

  @IsOptional()
  @IsString()
  source?: string

  @IsOptional()
  @IsString()
  fileName?: string

  @IsOptional()
  @IsInt()
  lineNumber?: number

  @IsOptional()
  @IsString()
  path?: string

  @IsOptional()
  @IsString()
  module?: string

  @IsOptional()
  @IsString()
  userAgent?: string
}
