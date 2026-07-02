import { IsOptional, IsString } from 'class-validator'

import type { StockMovementListQuery } from '@turbohesap/shared'

import { ListQueryDto } from '../../../common/list/list-query.dto'

export class StockMovementListQueryDto extends ListQueryDto implements StockMovementListQuery {
  @IsOptional() @IsString() productId?: string

  @IsOptional() @IsString() branchId?: string

  @IsOptional() @IsString() from?: string

  @IsOptional() @IsString() to?: string
}
