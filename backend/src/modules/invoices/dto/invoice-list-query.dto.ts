import { IsOptional, IsString } from 'class-validator'

import type { InvoiceListQuery, InvoiceStatus, InvoiceType } from '@turbohesap/shared'

import { ListQueryDto } from '../../../common/list/list-query.dto'

export class InvoiceListQueryDto extends ListQueryDto implements InvoiceListQuery {
  @IsOptional() @IsString() type?: InvoiceType

  @IsOptional() @IsString() status?: InvoiceStatus

  @IsOptional() @IsString() contactId?: string

  @IsOptional() @IsString() from?: string

  @IsOptional() @IsString() to?: string
}
