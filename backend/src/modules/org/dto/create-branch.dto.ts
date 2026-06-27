import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateIf,
} from 'class-validator'

import {
  BRANCH_TYPES,
  type BranchType,
  type CreateBranchRequest,
} from '@turbohesap/shared'

export class CreateBranchDto implements CreateBranchRequest {
  @IsString()
  @IsNotEmpty()
  code!: string

  @IsString()
  @IsNotEmpty()
  name!: string

  @IsOptional()
  @IsIn(BRANCH_TYPES)
  type?: BranchType

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsBoolean()
  isActive?: boolean

  // İletişim
  @IsOptional()
  @IsString()
  phone?: string

  @IsOptional()
  @IsString()
  secondaryPhone?: string

  @IsOptional()
  @IsString()
  fax?: string

  @IsOptional()
  @ValidateIf((_o, v) => v !== '' && v != null)
  @IsEmail()
  email?: string

  @IsOptional()
  @IsString()
  website?: string

  // Adres
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
  neighborhood?: string

  @IsOptional()
  @IsString()
  addressLine?: string

  @IsOptional()
  @IsString()
  postalCode?: string

  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number | null

  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number | null

  // Yetkili
  @IsOptional()
  @IsString()
  managerName?: string

  @IsOptional()
  @IsString()
  managerTitle?: string

  @IsOptional()
  @IsString()
  managerPhone?: string

  @IsOptional()
  @ValidateIf((_o, v) => v !== '' && v != null)
  @IsEmail()
  managerEmail?: string

  // Yasal / Vergi
  @IsOptional()
  @IsString()
  taxOffice?: string

  @IsOptional()
  @IsString()
  taxNumber?: string

  @IsOptional()
  @ValidateIf((_o, v) => v !== null && v !== '')
  @IsDateString()
  openingDate?: string | null
}
