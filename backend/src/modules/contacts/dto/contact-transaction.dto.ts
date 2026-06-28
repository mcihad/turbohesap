import {
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator'

import {
  CONTACT_DOCUMENT_TYPES,
  type ContactDocumentType,
  type CreateContactTransactionRequest,
  type UpdateContactTransactionRequest,
} from '@turbohesap/shared'

export class CreateContactTransactionDto implements CreateContactTransactionRequest {
  @IsString() @IsNotEmpty() contactId!: string
  @IsString() @IsNotEmpty() date!: string
  @IsIn(CONTACT_DOCUMENT_TYPES) documentType!: ContactDocumentType

  @IsOptional() @IsNumber() @Min(0) debit?: number
  @IsOptional() @IsNumber() @Min(0) credit?: number
  @IsOptional() @IsString() documentNo?: string | null
  @IsOptional() @IsString() description?: string | null
  @IsOptional() @IsString() currencyCode?: string
  @IsOptional() @IsNumber() @Min(0) exchangeRate?: number
  @IsOptional() @IsString() dueDate?: string | null
  @IsOptional() @IsString() sourceModule?: string | null
  @IsOptional() @IsString() sourceId?: string | null
}

export class UpdateContactTransactionDto implements UpdateContactTransactionRequest {
  @IsOptional() @IsString() date?: string
  @IsOptional() @IsIn(CONTACT_DOCUMENT_TYPES) documentType?: ContactDocumentType
  @IsOptional() @IsNumber() @Min(0) debit?: number
  @IsOptional() @IsNumber() @Min(0) credit?: number
  @IsOptional() @IsString() documentNo?: string | null
  @IsOptional() @IsString() description?: string | null
  @IsOptional() @IsString() currencyCode?: string
  @IsOptional() @IsNumber() @Min(0) exchangeRate?: number
  @IsOptional() @IsString() dueDate?: string | null
  @IsOptional() @IsString() sourceModule?: string | null
  @IsOptional() @IsString() sourceId?: string | null
}
