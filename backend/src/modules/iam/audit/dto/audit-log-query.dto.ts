import { Type } from 'class-transformer'
import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator'

import type { AuditAction, AuditLogQuery } from '@turbohesap/shared'

const ACTIONS: AuditAction[] = ['Insert', 'Update', 'Delete']

export class AuditLogQueryDto implements AuditLogQuery {
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
  @IsString()
  entityType?: string

  @IsOptional()
  @IsString()
  entityId?: string

  @IsOptional()
  @IsString()
  module?: string

  @IsOptional()
  @IsIn(ACTIONS)
  action?: AuditAction

  @IsOptional()
  @IsString()
  userId?: string

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
