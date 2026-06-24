import {
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator'

import { type CreateRoleRequest, MODULE_KEYS } from '@turbohesap/shared'

export class CreateRoleDto implements CreateRoleRequest {
  @IsString()
  @IsNotEmpty()
  name!: string

  @IsString()
  @IsIn(MODULE_KEYS)
  module!: string

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissionKeys?: string[]
}
