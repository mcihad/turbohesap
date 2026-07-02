import { PartialType } from '@nestjs/swagger'
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator'

import type {
  CreateUomCategoryRequest,
  CreateUomRequest,
  UomConvertRequest,
  UpdateUomCategoryRequest,
  UpdateUomRequest,
} from '@turbohesap/shared'

export class CreateUomCategoryDto implements CreateUomCategoryRequest {
  @IsString() @IsNotEmpty() name!: string
  @IsString() @IsNotEmpty() referenceUomCode!: string
  @IsOptional() @IsBoolean() isActive?: boolean
}
export class UpdateUomCategoryDto
  extends PartialType(CreateUomCategoryDto)
  implements UpdateUomCategoryRequest {}

export class CreateUomDto implements CreateUomRequest {
  @IsUUID() categoryId!: string
  @IsString() @IsNotEmpty() code!: string
  @IsString() @IsNotEmpty() name!: string
  @IsNumber() @Min(0.00000001) factorToReference!: number
  @IsOptional() @IsNumber() @Min(0) rounding?: number
  @IsOptional() @IsBoolean() isReference?: boolean
  @IsOptional() @IsBoolean() isActive?: boolean
}
export class UpdateUomDto extends PartialType(CreateUomDto) implements UpdateUomRequest {}

export class UomConvertDto implements UomConvertRequest {
  @IsNumber() quantity!: number
  @IsString() @IsNotEmpty() fromCode!: string
  @IsString() @IsNotEmpty() toCode!: string
}
