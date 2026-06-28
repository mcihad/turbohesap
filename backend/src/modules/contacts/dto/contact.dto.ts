import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from 'class-validator'

import { Type } from 'class-transformer'
import { ValidateNested } from 'class-validator'

import {
  CONTACT_ROLES,
  CONTACT_TYPES,
  type BalanceSide,
  type ContactRole,
  type ContactType,
  type ConvertLeadRequest,
  type CreateContactRequest,
  type UpdateContactRequest,
} from '@turbohesap/shared'

const BALANCE_SIDES: BalanceSide[] = ['debit', 'credit']

export class CreateContactDto implements CreateContactRequest {
  @IsIn(CONTACT_TYPES) contactType!: ContactType
  @IsIn(CONTACT_ROLES) role!: ContactRole
  @IsString() @IsNotEmpty() name!: string

  @IsOptional() @IsString() code?: string
  @IsOptional() @IsString() taxOffice?: string | null
  @IsOptional() @IsString() taxNumber?: string | null
  @IsOptional() @IsString() nationalId?: string | null
  @IsOptional() @IsString() email?: string | null
  @IsOptional() @IsString() phone?: string | null
  @IsOptional() @IsString() mobile?: string | null
  @IsOptional() @IsString() website?: string | null
  @IsOptional() @IsString() currencyCode?: string
  @IsOptional() @IsNumber() openingBalance?: number
  @IsOptional() @IsIn(BALANCE_SIDES) openingBalanceSide?: BalanceSide
  @IsOptional() @IsNumber() @Min(0) creditLimit?: number
  @IsOptional() @IsInt() @Min(0) paymentTermDays?: number
  @IsOptional() @IsString() groupId?: string | null
  @IsOptional() @IsString() ownerId?: string | null
  @IsOptional() @IsString() leadSource?: string | null
  @IsOptional() @IsString() leadStatus?: string | null
  @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[]
  @IsOptional() @IsString() iban?: string | null
  @IsOptional() @IsString() bankName?: string | null
  @IsOptional() @IsString() branchId?: string | null
  @IsOptional() @IsString() notes?: string | null
  @IsOptional() @IsObject() attributes?: Record<string, unknown>
  @IsOptional() @IsBoolean() isActive?: boolean
}

class ConvertOpportunityDto {
  @IsString() @IsNotEmpty() name!: string
  @IsOptional() @IsString() pipelineId?: string
  @IsOptional() @IsString() stageId?: string
  @IsOptional() @IsNumber() @Min(0) amount?: number
  @IsOptional() @IsString() expectedCloseDate?: string | null
}

export class ConvertLeadDto implements ConvertLeadRequest {
  @IsOptional() @IsIn(CONTACT_ROLES) toRole?: ContactRole
  @IsOptional() @IsBoolean() createOpportunity?: boolean
  @IsOptional()
  @ValidateNested()
  @Type(() => ConvertOpportunityDto)
  opportunity?: ConvertOpportunityDto
}

export class UpdateContactDto implements UpdateContactRequest {
  @IsOptional() @IsIn(CONTACT_TYPES) contactType?: ContactType
  @IsOptional() @IsIn(CONTACT_ROLES) role?: ContactRole
  @IsOptional() @IsString() @IsNotEmpty() name?: string
  @IsOptional() @IsString() code?: string
  @IsOptional() @IsString() taxOffice?: string | null
  @IsOptional() @IsString() taxNumber?: string | null
  @IsOptional() @IsString() nationalId?: string | null
  @IsOptional() @IsString() email?: string | null
  @IsOptional() @IsString() phone?: string | null
  @IsOptional() @IsString() mobile?: string | null
  @IsOptional() @IsString() website?: string | null
  @IsOptional() @IsString() currencyCode?: string
  @IsOptional() @IsNumber() openingBalance?: number
  @IsOptional() @IsIn(BALANCE_SIDES) openingBalanceSide?: BalanceSide
  @IsOptional() @IsNumber() @Min(0) creditLimit?: number
  @IsOptional() @IsInt() @Min(0) paymentTermDays?: number
  @IsOptional() @IsString() groupId?: string | null
  @IsOptional() @IsString() ownerId?: string | null
  @IsOptional() @IsString() leadSource?: string | null
  @IsOptional() @IsString() leadStatus?: string | null
  @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[]
  @IsOptional() @IsString() iban?: string | null
  @IsOptional() @IsString() bankName?: string | null
  @IsOptional() @IsString() branchId?: string | null
  @IsOptional() @IsString() notes?: string | null
  @IsOptional() @IsObject() attributes?: Record<string, unknown>
  @IsOptional() @IsBoolean() isActive?: boolean
}
