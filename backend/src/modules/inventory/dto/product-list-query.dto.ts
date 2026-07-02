import { IsOptional, IsString } from 'class-validator'

import type { ProductListQuery } from '@turbohesap/shared'

import { ListQueryDto } from '../../../common/list/list-query.dto'

export class ProductListQueryDto extends ListQueryDto implements ProductListQuery {
  @IsOptional() @IsString() categoryId?: string
}
