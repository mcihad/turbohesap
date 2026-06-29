import { Type } from 'class-transformer'
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator'

import {
  POS_ORDER_TYPES,
  POS_PAYMENT_METHODS,
  type AddPosPaymentRequest,
  type CreatePosOrderLineInput,
  type CreatePosOrderLineModifierInput,
  type CreatePosOrderRequest,
  type CreatePosRegisterRequest,
  type CloseSessionRequest,
  type OpenSessionRequest,
  type PosOrderType,
  type PosPaymentMethod,
  type ReturnPosOrderLineInput,
  type ReturnPosOrderRequest,
  type SplitPosOrderRequest,
  type UpdatePosRegisterRequest,
  type VoidPosOrderRequest,
} from '@turbohesap/shared'

// ── Registers ──
export class CreatePosRegisterDto implements CreatePosRegisterRequest {
  @IsString() @IsNotEmpty() name!: string
  @IsOptional() @IsString() code?: string
  @IsString() @IsNotEmpty() branchId!: string
  @IsOptional() @IsString() salesChannelId?: string | null
  @IsOptional() @IsString() defaultCashAccountId?: string | null
  @IsOptional() @IsObject() settings?: CreatePosRegisterRequest['settings']
  @IsOptional() @IsBoolean() isActive?: boolean
}
export class UpdatePosRegisterDto implements UpdatePosRegisterRequest {
  @IsOptional() @IsString() @IsNotEmpty() name?: string
  @IsOptional() @IsString() code?: string
  @IsOptional() @IsString() branchId?: string
  @IsOptional() @IsString() salesChannelId?: string | null
  @IsOptional() @IsString() defaultCashAccountId?: string | null
  @IsOptional() @IsObject() settings?: UpdatePosRegisterRequest['settings']
  @IsOptional() @IsBoolean() isActive?: boolean
}

// ── Sessions ──
export class OpenSessionDto implements OpenSessionRequest {
  @IsString() @IsNotEmpty() registerId!: string
  @IsOptional() @IsNumber() @Min(0) openingCash?: number
}
export class CloseSessionDto implements CloseSessionRequest {
  @IsOptional() @IsNumber() @Min(0) countedCash?: number
  @IsOptional() @IsString() notes?: string | null
}

// ── Orders ──
export class CreatePosOrderLineModifierDto implements CreatePosOrderLineModifierInput {
  @IsOptional() @IsString() groupId?: string | null
  @IsOptional() @IsString() optionId?: string | null
  @IsOptional() @IsString() groupName?: string
  @IsOptional() @IsString() optionName?: string
  @IsOptional() @IsNumber() priceDelta?: number
}
export class CreatePosOrderLineDto implements CreatePosOrderLineInput {
  @IsOptional() @IsString() productId?: string | null
  @IsOptional() @IsString() variantId?: string | null
  @IsOptional() @IsString() name?: string
  @IsNumber() @Min(0.0001) qty!: number
  @IsOptional() @IsNumber() @Min(0) unitPrice?: number
  @IsOptional() @IsNumber() @Min(0) discount?: number
  @IsOptional() @IsNumber() @Min(0) taxRate?: number
  @IsOptional() @IsString() notes?: string | null
  @IsOptional() @IsBoolean() isBundleChild?: boolean
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePosOrderLineModifierDto)
  modifiers?: CreatePosOrderLineModifierDto[]
}
export class CreatePosOrderDto implements CreatePosOrderRequest {
  @IsOptional() @IsString() clientRef?: string
  @IsString() @IsNotEmpty() registerId!: string
  @IsOptional() @IsString() sessionId?: string | null
  @IsOptional() @IsIn(POS_ORDER_TYPES) orderType?: PosOrderType
  @IsOptional() @IsString() contactId?: string | null
  @IsOptional() @IsString() tableId?: string | null
  @IsOptional() @IsString() notes?: string | null
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePosOrderLineDto)
  lines!: CreatePosOrderLineDto[]
}
export class UpdatePosOrderDto {
  @IsOptional() @IsIn(POS_ORDER_TYPES) orderType?: PosOrderType
  @IsOptional() @IsString() contactId?: string | null
  @IsOptional() @IsString() tableId?: string | null
  @IsOptional() @IsString() notes?: string | null
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePosOrderLineDto)
  lines?: CreatePosOrderLineDto[]
}
export class AddPosPaymentDto implements AddPosPaymentRequest {
  @IsIn(POS_PAYMENT_METHODS) method!: PosPaymentMethod
  @IsNumber() @Min(0) amount!: number
  @IsOptional() @IsString() cashAccountId?: string | null
  @IsOptional() @IsString() bankAccountId?: string | null
  @IsOptional() @IsString() contactId?: string | null
  @IsOptional() @IsNumber() @Min(0) tendered?: number
  @IsOptional() @IsString() clientRef?: string
}
export class SplitPosOrderDto implements SplitPosOrderRequest {
  @IsArray() @IsString({ each: true }) lineIds!: string[]
}
export class VoidPosOrderDto implements VoidPosOrderRequest {
  @IsOptional() @IsString() reason?: string | null
  @IsOptional() @IsBoolean() refund?: boolean
}
export class ReturnPosOrderLineDto implements ReturnPosOrderLineInput {
  @IsString() @IsNotEmpty() lineId!: string
  @IsNumber() @Min(0.0001) qty!: number
}
export class ReturnPosOrderDto implements ReturnPosOrderRequest {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReturnPosOrderLineDto)
  lines!: ReturnPosOrderLineDto[]
  @IsOptional() @IsString() reason?: string | null
  @IsOptional() @IsBoolean() refund?: boolean
}
