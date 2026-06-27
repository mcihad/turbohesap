import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
} from '@nestjs/common'

import { SalesPermissions, type SalesChannelDto } from '@turbohesap/shared'

import { RequirePermissions } from '../../common/decorators/permissions.decorator'
import { CreateSalesChannelDto } from './dto/create-sales-channel.dto'
import { UpdateSalesChannelDto } from './dto/update-sales-channel.dto'
import { SalesChannelsService } from './sales-channels.service'

// Authorization is enforced by the global PermissionsGuard via the
// @RequirePermissions decorators below (see app.module.ts).
@Controller('sales/channels')
export class SalesChannelsController {
  constructor(private readonly channels: SalesChannelsService) {}

  @Get()
  @RequirePermissions(SalesPermissions.channelsRead)
  list(): Promise<SalesChannelDto[]> {
    return this.channels.list()
  }

  @Get(':id')
  @RequirePermissions(SalesPermissions.channelsRead)
  get(@Param('id') id: string): Promise<SalesChannelDto> {
    return this.channels.get(id)
  }

  @Post()
  @RequirePermissions(SalesPermissions.channelsWrite)
  create(@Body() dto: CreateSalesChannelDto): Promise<SalesChannelDto> {
    return this.channels.create(dto)
  }

  @Patch(':id')
  @RequirePermissions(SalesPermissions.channelsWrite)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateSalesChannelDto,
  ): Promise<SalesChannelDto> {
    return this.channels.update(id, dto)
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermissions(SalesPermissions.channelsWrite)
  async remove(@Param('id') id: string): Promise<void> {
    await this.channels.remove(id)
  }
}
