import { Type } from 'class-transformer'
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator'

import {
  FATURA_TIPLERI,
  INVOICE_TYPES,
  SENARYOLAR,
  VAT_RATES,
  type CreateInvoiceLineInput,
  type CreateInvoiceRequest,
  type FaturaTipi,
  type InvoiceType,
  type Senaryo,
  type UpdateInvoiceRequest,
} from '@turbohesap/shared'

export class CreateInvoiceLineDto implements CreateInvoiceLineInput {
  @IsOptional() @IsString() productId?: string | null
  @IsString() @IsNotEmpty() description!: string
  @IsNumber() @Min(0) quantity!: number
  @IsOptional() @IsString() unit?: string
  @IsNumber() @Min(0) unitPrice!: number
  @IsOptional() @IsNumber() @Min(0) discountRate?: number
  @IsIn(VAT_RATES) vatRate!: number
  @IsOptional() @IsString() withholdingCode?: string | null
  @IsOptional() @IsInt() sortOrder?: number
}

export class CreateInvoiceDto implements CreateInvoiceRequest {
  @IsIn(INVOICE_TYPES) type!: InvoiceType
  @IsString() @IsNotEmpty() date!: string
  @IsString() @IsNotEmpty() contactId!: string

  @IsArray()
  @ArrayMinSize(1, { message: 'En az bir fatura kalemi girilmelidir' })
  @ValidateNested({ each: true })
  @Type(() => CreateInvoiceLineDto)
  lines!: CreateInvoiceLineDto[]

  @IsOptional() @IsString() dueDate?: string | null
  @IsOptional() @IsString() branchId?: string | null
  @IsOptional() @IsString() currencyCode?: string
  @IsOptional() @IsNumber() @Min(0) exchangeRate?: number
  @IsOptional() @IsString() series?: string
  @IsOptional() @IsIn(FATURA_TIPLERI) faturaTipi?: FaturaTipi
  @IsOptional() @IsIn(SENARYOLAR) senaryo?: Senaryo
  @IsOptional() @IsIn(['efatura', 'earsiv', 'none']) eDocType?: 'efatura' | 'earsiv' | 'none'
  @IsOptional() @IsString() notes?: string | null
  @IsOptional() @IsIn(['draft', 'issued']) status?: 'draft' | 'issued'
}

export class UpdateInvoiceDto implements UpdateInvoiceRequest {
  @IsOptional() @IsIn(INVOICE_TYPES) type?: InvoiceType
  @IsOptional() @IsString() date?: string
  @IsOptional() @IsString() contactId?: string

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateInvoiceLineDto)
  lines?: CreateInvoiceLineDto[]

  @IsOptional() @IsString() dueDate?: string | null
  @IsOptional() @IsString() branchId?: string | null
  @IsOptional() @IsString() currencyCode?: string
  @IsOptional() @IsNumber() @Min(0) exchangeRate?: number
  @IsOptional() @IsString() series?: string
  @IsOptional() @IsIn(FATURA_TIPLERI) faturaTipi?: FaturaTipi
  @IsOptional() @IsIn(SENARYOLAR) senaryo?: Senaryo
  @IsOptional() @IsIn(['efatura', 'earsiv', 'none']) eDocType?: 'efatura' | 'earsiv' | 'none'
  @IsOptional() @IsString() notes?: string | null
}
