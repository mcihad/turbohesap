import { Type } from 'class-transformer'
import {
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
  MODIFIER_SELECTION_TYPES,
  type CreateModifierGroupRequest,
  type CreateModifierOptionRequest,
  type ModifierSelectionType,
  type SetProductModifiersRequest,
  type UpdateModifierGroupRequest,
  type UpdateModifierOptionRequest,
} from '@turbohesap/shared'

export class CreateModifierOptionDto implements CreateModifierOptionRequest {
  @IsString() @IsNotEmpty() name!: string
  @IsOptional() @IsNumber() priceDelta?: number
  @IsOptional() @IsBoolean() isDefault?: boolean
  @IsOptional() @IsInt() sortOrder?: number
  @IsOptional() @IsBoolean() isActive?: boolean
  @IsOptional() @IsString() stockProductId?: string | null
  @IsOptional() @IsString() stockVariantId?: string | null
  @IsOptional() @IsNumber() @Min(0) consumeQty?: number
  @IsOptional() @IsBoolean() deductStock?: boolean
  @IsOptional() @IsBoolean() returnable?: boolean
}

export class UpdateModifierOptionDto implements UpdateModifierOptionRequest {
  @IsOptional() @IsString() @IsNotEmpty() name?: string
  @IsOptional() @IsNumber() priceDelta?: number
  @IsOptional() @IsBoolean() isDefault?: boolean
  @IsOptional() @IsInt() sortOrder?: number
  @IsOptional() @IsBoolean() isActive?: boolean
  @IsOptional() @IsString() stockProductId?: string | null
  @IsOptional() @IsString() stockVariantId?: string | null
  @IsOptional() @IsNumber() @Min(0) consumeQty?: number
  @IsOptional() @IsBoolean() deductStock?: boolean
  @IsOptional() @IsBoolean() returnable?: boolean
}

export class CreateModifierGroupDto implements CreateModifierGroupRequest {
  @IsString() @IsNotEmpty() name!: string
  @IsOptional() @IsIn(MODIFIER_SELECTION_TYPES) selectionType?: ModifierSelectionType
  @IsOptional() @IsBoolean() required?: boolean
  @IsOptional() @IsInt() @Min(0) minSelect?: number
  @IsOptional() @IsInt() @Min(1) maxSelect?: number | null
  @IsOptional() @IsInt() sortOrder?: number
  @IsOptional() @IsBoolean() isActive?: boolean
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateModifierOptionDto)
  options?: CreateModifierOptionDto[]
}

export class UpdateModifierGroupDto implements UpdateModifierGroupRequest {
  @IsOptional() @IsString() @IsNotEmpty() name?: string
  @IsOptional() @IsIn(MODIFIER_SELECTION_TYPES) selectionType?: ModifierSelectionType
  @IsOptional() @IsBoolean() required?: boolean
  @IsOptional() @IsInt() @Min(0) minSelect?: number
  @IsOptional() @IsInt() @Min(1) maxSelect?: number | null
  @IsOptional() @IsInt() sortOrder?: number
  @IsOptional() @IsBoolean() isActive?: boolean
}

export class SetProductModifiersDto implements SetProductModifiersRequest {
  @IsArray() @IsString({ each: true }) groupIds!: string[]
}
