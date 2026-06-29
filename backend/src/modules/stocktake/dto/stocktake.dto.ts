import { Type } from 'class-transformer'
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator'

import {
  COUNT_REASONS,
  STOCK_COUNT_KINDS,
  type CountEntryInput,
  type CountReason,
  type CreateStockCountRequest,
  type SetCountLineRequest,
  type StockCountKind,
  type SubmitCountEntriesRequest,
} from '@turbohesap/shared'

export class CreateStockCountDto implements CreateStockCountRequest {
  @IsIn(STOCK_COUNT_KINDS) kind!: StockCountKind
  @IsOptional() @IsString() branchId?: string | null
  @IsOptional() @IsBoolean() blind?: boolean
  @IsOptional() @IsString() name?: string
  @IsOptional() @IsString() plannedDate?: string | null
  @IsOptional() @IsNumber() @Min(0) recountThresholdPct?: number
  @IsOptional() @IsArray() @IsString({ each: true }) scopeCategoryIds?: string[]
  @IsOptional() @IsArray() @IsString({ each: true }) scopeProductIds?: string[]
  @IsOptional() @IsString() abcClass?: string | null
  @IsOptional() @IsBoolean() allowAddUnlisted?: boolean
  @IsOptional() @IsBoolean() countUnscannedAsZero?: boolean
}

export class CountEntryInputDto implements CountEntryInput {
  @IsOptional() @IsString() lineId?: string
  @IsOptional() @IsString() barcode?: string
  @IsOptional() @IsString() productId?: string
  @IsOptional() @IsString() variantId?: string | null
  @IsNumber() qty!: number
}

export class SubmitCountEntriesDto implements SubmitCountEntriesRequest {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CountEntryInputDto)
  entries!: CountEntryInputDto[]
}

export class SetCountLineDto implements SetCountLineRequest {
  @IsOptional() @IsNumber() @Min(0) countedQty?: number
  @IsOptional() @IsIn(COUNT_REASONS) reasonCode?: CountReason | null
  @IsOptional() @IsString() notes?: string | null
}
