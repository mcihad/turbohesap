import { Type } from 'class-transformer'
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator'

import type {
  SetRecipeComponentInput,
  SetProductRecipeRequest,
} from '@turbohesap/shared'

export class SetRecipeComponentDto implements SetRecipeComponentInput {
  @IsString() @IsNotEmpty() componentProductId!: string
  @IsOptional() @IsString() componentVariantId?: string | null
  @IsOptional() @IsNumber() @Min(0) quantity?: number
  @IsOptional() @IsString() unit?: string | null
  @IsOptional() @IsInt() sortOrder?: number
}

export class SetProductRecipeDto implements SetProductRecipeRequest {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SetRecipeComponentDto)
  components!: SetRecipeComponentDto[]
}
