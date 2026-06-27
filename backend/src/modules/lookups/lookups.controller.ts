import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common'

import {
  LookupsPermissions,
  type LookupItemDto,
  type LookupListInfo,
} from '@turbohesap/shared'

import { RequirePermissions } from '../../common/decorators/permissions.decorator'
import { CreateLookupItemDto } from './dto/create-lookup-item.dto'
import { UpdateLookupItemDto } from './dto/update-lookup-item.dto'
import { LookupsService } from './lookups.service'

// Generic key/value reference-data lists. Reads require lookups.read (the
// LookupSelect + management view); mutations require lookups.write.
@Controller('lookups')
export class LookupsController {
  constructor(private readonly lookups: LookupsService) {}

  // GET /api/lookups/items?list=birim
  @Get('items')
  @RequirePermissions(LookupsPermissions.read)
  list(@Query('list') list?: string): Promise<LookupItemDto[]> {
    return this.lookups.list(list)
  }

  // GET /api/lookups/lists
  @Get('lists')
  @RequirePermissions(LookupsPermissions.read)
  lists(): Promise<LookupListInfo[]> {
    return this.lookups.lists()
  }

  @Get('items/:id')
  @RequirePermissions(LookupsPermissions.read)
  get(@Param('id') id: string): Promise<LookupItemDto> {
    return this.lookups.get(id)
  }

  @Post('items')
  @RequirePermissions(LookupsPermissions.write)
  create(@Body() dto: CreateLookupItemDto): Promise<LookupItemDto> {
    return this.lookups.create(dto)
  }

  @Patch('items/:id')
  @RequirePermissions(LookupsPermissions.write)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateLookupItemDto,
  ): Promise<LookupItemDto> {
    return this.lookups.update(id, dto)
  }

  @Delete('items/:id')
  @HttpCode(204)
  @RequirePermissions(LookupsPermissions.write)
  async remove(@Param('id') id: string): Promise<void> {
    await this.lookups.remove(id)
  }
}
