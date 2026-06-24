import { IsArray, IsIn, IsOptional, IsString } from 'class-validator'

import { MODULE_KEYS, type UpdateRoleRequest } from '@turbohesap/shared'

export class UpdateRoleDto implements UpdateRoleRequest {
  @IsOptional()
  @IsString()
  name?: string

  @IsOptional()
  @IsString()
  @IsIn(MODULE_KEYS)
  module?: string

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissionKeys?: string[]
}
