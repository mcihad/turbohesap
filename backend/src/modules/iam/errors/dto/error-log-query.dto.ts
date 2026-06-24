import { Type } from 'class-transformer'
import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator'

import type {
  ErrorLogOrigin,
  ErrorLogQuery,
  ErrorLogStatus,
} from '@turbohesap/shared'

const ORIGINS: ErrorLogOrigin[] = ['server', 'client']
const STATUSES: ErrorLogStatus[] = [
  'new',
  'investigating',
  'resolved',
  'ignored',
]

export class ErrorLogQueryDto implements ErrorLogQuery {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number

  @IsOptional()
  @IsIn(ORIGINS)
  origin?: ErrorLogOrigin

  @IsOptional()
  @IsIn(STATUSES)
  status?: ErrorLogStatus

  @IsOptional()
  @IsString()
  module?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  statusCode?: number

  @IsOptional()
  @IsString()
  search?: string

  @IsOptional()
  @IsString()
  from?: string

  @IsOptional()
  @IsString()
  to?: string
}
