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
  type AssetMaintenanceDto,
} from '@turbohesap/shared'

import { RequirePermissions } from '../../common/decorators/permissions.decorator'
import {
  CreateAssetMaintenanceDto,
  UpdateAssetMaintenanceDto,
} from './dto/asset-maintenance.dto'
import { AssetMaintenanceListQueryDto } from './dto/asset-query.dto'
import { AssetMaintenanceService } from './asset-maintenance.service'

@Controller('inventory/asset-maintenance')
export class AssetMaintenanceController {
  constructor(private readonly maintenance: AssetMaintenanceService) {}

  @Get()
  @RequirePermissions(InventoryPermissions.assetsRead)
  list(
    @Query() query: AssetMaintenanceListQueryDto,
  ): Promise<AssetMaintenanceDto[]> {
    return this.maintenance.list(query)
  }

  @Get(':id')
  @RequirePermissions(InventoryPermissions.assetsRead)
  get(@Param('id') id: string): Promise<AssetMaintenanceDto> {
    return this.maintenance.get(id)
  }

  @Post()
  @RequirePermissions(InventoryPermissions.assetsMaintain)
  create(
    @Body() dto: CreateAssetMaintenanceDto,
  ): Promise<AssetMaintenanceDto> {
    return this.maintenance.create(dto)
  }

  @Patch(':id')
  @RequirePermissions(InventoryPermissions.assetsMaintain)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateAssetMaintenanceDto,
  ): Promise<AssetMaintenanceDto> {
    return this.maintenance.update(id, dto)
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermissions(InventoryPermissions.assetsMaintain)
  async remove(@Param('id') id: string): Promise<void> {
    await this.maintenance.remove(id)
  }
}
