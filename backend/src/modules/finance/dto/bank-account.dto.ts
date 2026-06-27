import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator'
import type { CreateBankAccountRequest } from '@turbohesap/shared'

export class CreateBankAccountDto implements CreateBankAccountRequest {
  @IsString()
  @IsNotEmpty()
  name!: string

  @IsString()
  @IsNotEmpty()
  bankName!: string

  @IsOptional()
  @IsString()
  branchName?: string

  @IsOptional()
  @IsString()
  branchCode?: string

  @IsOptional()
  @IsString()
  accountNumber?: string

  @IsString()
  @IsNotEmpty()
  iban!: string

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

export class UpdateBankAccountDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  bankName?: string

  @IsOptional()
  @IsString()
  branchName?: string

  @IsOptional()
  @IsString()
  branchCode?: string

  @IsOptional()
  @IsString()
  accountNumber?: string

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  iban?: string

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
