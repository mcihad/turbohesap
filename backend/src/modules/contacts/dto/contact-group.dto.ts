import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator'

import type {
  CreateContactGroupRequest,
  UpdateContactGroupRequest,
} from '@turbohesap/shared'

export class CreateContactGroupDto implements CreateContactGroupRequest {
  @IsString()
  @IsNotEmpty()
  name!: string

  @IsOptional()
  @IsString()
  parentId?: string | null

  @IsOptional()
  @IsString()
  code?: string

  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}

export class UpdateContactGroupDto implements UpdateContactGroupRequest {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string

  @IsOptional()
  @IsString()
  parentId?: string | null

  @IsOptional()
  @IsString()
  code?: string

  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}
