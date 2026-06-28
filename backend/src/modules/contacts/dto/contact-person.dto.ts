import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator'

import type {
  CreateContactPersonRequest,
  UpdateContactPersonRequest,
} from '@turbohesap/shared'

export class CreateContactPersonDto implements CreateContactPersonRequest {
  @IsString() @IsNotEmpty() contactId!: string
  @IsString() @IsNotEmpty() firstName!: string

  @IsOptional() @IsString() lastName?: string
  @IsOptional() @IsString() title?: string | null
  @IsOptional() @IsString() department?: string | null
  @IsOptional() @IsString() email?: string | null
  @IsOptional() @IsString() phone?: string | null
  @IsOptional() @IsString() mobile?: string | null
  @IsOptional() @IsBoolean() isPrimary?: boolean
  @IsOptional() @IsString() notes?: string | null
}

export class UpdateContactPersonDto implements UpdateContactPersonRequest {
  @IsOptional() @IsString() @IsNotEmpty() firstName?: string
  @IsOptional() @IsString() lastName?: string
  @IsOptional() @IsString() title?: string | null
  @IsOptional() @IsString() department?: string | null
  @IsOptional() @IsString() email?: string | null
  @IsOptional() @IsString() phone?: string | null
  @IsOptional() @IsString() mobile?: string | null
  @IsOptional() @IsBoolean() isPrimary?: boolean
  @IsOptional() @IsString() notes?: string | null
}
