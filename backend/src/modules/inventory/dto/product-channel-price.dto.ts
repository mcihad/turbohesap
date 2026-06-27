import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateIf,
} from 'class-validator'

import type { UpsertProductChannelPriceRequest } from '@turbohesap/shared'

// Set the price for one (variant?, channel) cell.
export class UpsertProductChannelPriceDto
  implements UpsertProductChannelPriceRequest
{
  @IsUUID()
  @IsNotEmpty()
  channelId!: string

  @IsNumber()
  @Min(0)
  salePrice!: number

  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsUUID()
  variantId?: string | null

  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsString()
  currency?: string | null

  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}
