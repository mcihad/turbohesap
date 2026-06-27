import {
  IsNumber,
  IsOptional,
  IsUUID,
  ValidateIf,
} from 'class-validator'

import type { UpsertProductStockRequest } from '@turbohesap/shared'

// Set the absolute on-hand quantity for one (variant?, branch?) cell.
export class UpsertProductStockDto implements UpsertProductStockRequest {
  @IsNumber()
  quantity!: number

  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsUUID()
  branchId?: string | null

  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsUUID()
  variantId?: string | null
}
