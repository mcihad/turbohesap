import { Type } from 'class-transformer'
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
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
  ORDER_DIRECTIONS,
  ORDER_KINDS,
  type ConvertOrderRequest,
  type CreateOrderDocumentLineInput,
  type CreateOrderDocumentRequest,
  type OrderDirection,
  type OrderKind,
  type UpdateOrderDocumentRequest,
} from '@turbohesap/shared'

export class CreateOrderDocumentLineDto implements CreateOrderDocumentLineInput {
  @IsOptional() @IsString() productId?: string | null
  @IsOptional() @IsString() variantId?: string | null
  @IsOptional() @IsString() description?: string
  @IsNumber() @Min(0) quantity!: number
  @IsOptional() @IsString() unit?: string
  @IsOptional() @IsNumber() @Min(0) unitPrice?: number
  @IsOptional() @IsNumber() @Min(0) discountRate?: number
  @IsOptional() @IsInt() vatRate?: number
  @IsOptional() @IsString() withholdingCode?: string | null
  @IsOptional() @IsInt() sortOrder?: number
}

export class CreateOrderDocumentDto implements CreateOrderDocumentRequest {
  @IsIn(ORDER_KINDS) kind!: OrderKind
  @IsIn(ORDER_DIRECTIONS) direction!: OrderDirection
  @IsString() @IsNotEmpty() date!: string
  @IsString() @IsNotEmpty() contactId!: string

  @IsArray()
  @ArrayMinSize(1, { message: 'En az bir belge kalemi girilmelidir' })
  @ValidateNested({ each: true })
  @Type(() => CreateOrderDocumentLineDto)
  lines!: CreateOrderDocumentLineDto[]

  @IsOptional() @IsString() branchId?: string | null
  @IsOptional() @IsString() validUntil?: string | null
  @IsOptional() @IsString() dueDate?: string | null
  @IsOptional() @IsString() currencyCode?: string
  @IsOptional() @IsNumber() @Min(0) exchangeRate?: number
  @IsOptional() @IsString() series?: string
  @IsOptional() @IsString() notes?: string | null
  @IsOptional() @IsBoolean() confirm?: boolean
}

export class UpdateOrderDocumentDto implements UpdateOrderDocumentRequest {
  @IsOptional() @IsString() date?: string
  @IsOptional() @IsString() contactId?: string

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderDocumentLineDto)
  lines?: CreateOrderDocumentLineDto[]

  @IsOptional() @IsString() branchId?: string | null
  @IsOptional() @IsString() validUntil?: string | null
  @IsOptional() @IsString() dueDate?: string | null
  @IsOptional() @IsString() currencyCode?: string
  @IsOptional() @IsNumber() @Min(0) exchangeRate?: number
  @IsOptional() @IsString() series?: string
  @IsOptional() @IsString() notes?: string | null
}

export class ConvertOrderDto implements ConvertOrderRequest {
  @IsOptional() @IsIn([...ORDER_KINDS, 'invoice']) toKind?: OrderKind | 'invoice'
}
