import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator'

import type { CreateUserRequest } from '@turbohesap/shared'

export class CreateUserDto implements CreateUserRequest {
  @IsString()
  @IsNotEmpty()
  username!: string

  @IsEmail()
  email!: string

  @IsString()
  @MinLength(6)
  password!: string

  @IsOptional()
  @IsString()
  firstName?: string

  @IsOptional()
  @IsString()
  lastName?: string

  @IsOptional()
  @IsBoolean()
  isActive?: boolean

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  roleIds?: string[]

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  branchIds?: string[]

  @IsOptional()
  @IsString()
  telegramChatId?: string | null

  @IsOptional()
  @IsBoolean()
  isPosUser?: boolean

  @IsOptional()
  @IsString()
  posPin?: string | null
}
