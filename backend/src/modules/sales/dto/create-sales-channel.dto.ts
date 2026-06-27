import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateIf,
} from 'class-validator'

import {
  type CreateSalesChannelRequest,
  SALES_CHANNEL_TYPES,
  type SalesChannelType,
} from '@turbohesap/shared'

export class CreateSalesChannelDto implements CreateSalesChannelRequest {
  @IsString()
  @IsNotEmpty()
  code!: string

  @IsString()
  @IsNotEmpty()
  name!: string

  @IsOptional()
  @IsIn(SALES_CHANNEL_TYPES)
  type?: SalesChannelType

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsBoolean()
  isActive?: boolean

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number

  // null clears the value; otherwise a 0–100 percentage.
  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsNumber()
  @Min(0)
  @Max(100)
  commissionRate?: number | null

  @IsOptional()
  @IsString()
  currency?: string

  @IsOptional()
  @IsString()
  website?: string

  @IsOptional()
  @IsString()
  contactName?: string

  @IsOptional()
  @IsString()
  contactTitle?: string

  @IsOptional()
  @IsString()
  contactPhone?: string

  @IsOptional()
  @ValidateIf((_o, v) => v !== '' && v != null)
  @IsEmail()
  contactEmail?: string

  @IsOptional()
  @IsString()
  country?: string

  @IsOptional()
  @IsString()
  city?: string

  @IsOptional()
  @IsString()
  district?: string

  @IsOptional()
  @IsString()
  addressLine?: string

  @IsOptional()
  @IsString()
  postalCode?: string
}
