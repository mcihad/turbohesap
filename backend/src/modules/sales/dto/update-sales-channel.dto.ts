import { PartialType } from '@nestjs/swagger'

import type { UpdateSalesChannelRequest } from '@turbohesap/shared'

import { CreateSalesChannelDto } from './create-sales-channel.dto'

// All fields optional for PATCH (code/name lose their @IsNotEmpty requirement).
export class UpdateSalesChannelDto
  extends PartialType(CreateSalesChannelDto)
  implements UpdateSalesChannelRequest {}
