import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator'
import type { CreateCashAccountRequest } from '@turbohesap/shared'

export class CreateCashAccountDto implements CreateCashAccountRequest {
  @IsString()
  @IsNotEmpty()
  name!: string

  @IsString()
  @IsNotEmpty()
  currency!: string

  @IsOptional()
  @IsNumber()
  openingBalance?: number

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}

export class UpdateCashAccountDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  currency?: string

  @IsOptional()
  @IsNumber()
  openingBalance?: number

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}
