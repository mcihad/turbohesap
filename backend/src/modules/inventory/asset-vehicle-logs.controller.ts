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
  InventoryPermissions,
  type AssetVehicleLogDto,
} from '@turbohesap/shared'

import { RequirePermissions } from '../../common/decorators/permissions.decorator'
import {
  CreateAssetVehicleLogDto,
  UpdateAssetVehicleLogDto,
} from './dto/asset-vehicle-log.dto'
import { AssetVehicleLogListQueryDto } from './dto/asset-query.dto'
import { AssetVehicleLogsService } from './asset-vehicle-logs.service'

@Controller('inventory/asset-vehicle-logs')
export class AssetVehicleLogsController {
  constructor(private readonly logs: AssetVehicleLogsService) {}

  @Get()
  @RequirePermissions(InventoryPermissions.assetsRead)
  list(
    @Query() query: AssetVehicleLogListQueryDto,
  ): Promise<AssetVehicleLogDto[]> {
    return this.logs.list(query)
  }

  @Get(':id')
  @RequirePermissions(InventoryPermissions.assetsRead)
  get(@Param('id') id: string): Promise<AssetVehicleLogDto> {
    return this.logs.get(id)
  }

  @Post()
  @RequirePermissions(InventoryPermissions.assetsMaintain)
  create(
    @Body() dto: CreateAssetVehicleLogDto,
  ): Promise<AssetVehicleLogDto> {
    return this.logs.create(dto)
  }

  @Patch(':id')
  @RequirePermissions(InventoryPermissions.assetsMaintain)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateAssetVehicleLogDto,
  ): Promise<AssetVehicleLogDto> {
    return this.logs.update(id, dto)
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermissions(InventoryPermissions.assetsMaintain)
  async remove(@Param('id') id: string): Promise<void> {
    await this.logs.remove(id)
  }
}
