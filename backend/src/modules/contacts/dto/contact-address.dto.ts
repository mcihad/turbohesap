import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator'

import {
  ADDRESS_TYPES,
  type AddressType,
  type CreateContactAddressRequest,
  type UpdateContactAddressRequest,
} from '@turbohesap/shared'

export class CreateContactAddressDto implements CreateContactAddressRequest {
  @IsString() @IsNotEmpty() contactId!: string
  @IsIn(ADDRESS_TYPES) addressType!: AddressType
  @IsString() @IsNotEmpty() line1!: string
  @IsString() @IsNotEmpty() city!: string

  @IsOptional() @IsString() title?: string | null
  @IsOptional() @IsString() line2?: string | null
  @IsOptional() @IsString() district?: string | null
  @IsOptional() @IsString() postalCode?: string | null
  @IsOptional() @IsString() country?: string
  @IsOptional() @IsString() phone?: string | null
  @IsOptional() @IsBoolean() isPrimaryBilling?: boolean
  @IsOptional() @IsBoolean() isPrimaryShipping?: boolean
}

export class UpdateContactAddressDto implements UpdateContactAddressRequest {
  @IsOptional() @IsIn(ADDRESS_TYPES) addressType?: AddressType
  @IsOptional() @IsString() @IsNotEmpty() line1?: string
  @IsOptional() @IsString() @IsNotEmpty() city?: string
  @IsOptional() @IsString() title?: string | null
  @IsOptional() @IsString() line2?: string | null
  @IsOptional() @IsString() district?: string | null
  @IsOptional() @IsString() postalCode?: string | null
  @IsOptional() @IsString() country?: string
  @IsOptional() @IsString() phone?: string | null
  @IsOptional() @IsBoolean() isPrimaryBilling?: boolean
  @IsOptional() @IsBoolean() isPrimaryShipping?: boolean
}
