import { Type } from 'class-transformer'
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator'

import type {
  SetBundleComponentInput,
  SetProductBundleRequest,
} from '@turbohesap/shared'

export class SetBundleComponentDto implements SetBundleComponentInput {
  @IsString() @IsNotEmpty() componentProductId!: string
  @IsOptional() @IsString() componentVariantId?: string | null
  @IsOptional() @IsNumber() @Min(0) qty?: number
  @IsOptional() @IsBoolean() isFree?: boolean
  @IsOptional() @IsNumber() @Min(0) unitPrice?: number | null
  @IsOptional() @IsBoolean() deductStock?: boolean
  @IsOptional() @IsBoolean() returnable?: boolean
  @IsOptional() @IsInt() sortOrder?: number
}

export class SetProductBundleDto implements SetProductBundleRequest {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SetBundleComponentDto)
  components!: SetBundleComponentDto[]
}
