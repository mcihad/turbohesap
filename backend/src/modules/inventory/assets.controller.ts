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

import { InventoryPermissions, type AssetDto } from '@turbohesap/shared'

import { RequirePermissions } from '../../common/decorators/permissions.decorator'
import {
  CreateAssetDto,
  UpdateAssetDto,
  ChangeAssetStatusDto,
} from './dto/create-asset.dto'
import { AssetListQueryDto } from './dto/asset-query.dto'
import { AssetsService } from './assets.service'

@Controller('inventory/assets')
export class AssetsController {
  constructor(private readonly assets: AssetsService) {}

  @Get()
  @RequirePermissions(InventoryPermissions.assetsRead)
  list(@Query() query: AssetListQueryDto): Promise<AssetDto[]> {
    return this.assets.list(query)
  }

  @Get(':id')
  @RequirePermissions(InventoryPermissions.assetsRead)
  get(@Param('id') id: string): Promise<AssetDto> {
    return this.assets.get(id)
  }

  @Post()
  @RequirePermissions(InventoryPermissions.assetsWrite)
  create(@Body() dto: CreateAssetDto): Promise<AssetDto> {
    return this.assets.create(dto)
  }

  // Lifecycle status change (giriş/çıkış, kayıp, hurda…). Sub-path under :id —
  // does not shadow the collection.
  @Post(':id/status')
  @RequirePermissions(InventoryPermissions.assetsWrite)
  changeStatus(
    @Param('id') id: string,
    @Body() dto: ChangeAssetStatusDto,
  ): Promise<AssetDto> {
    return this.assets.changeStatus(id, dto)
  }

  @Patch(':id')
  @RequirePermissions(InventoryPermissions.assetsWrite)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateAssetDto,
  ): Promise<AssetDto> {
    return this.assets.update(id, dto)
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermissions(InventoryPermissions.assetsWrite)
  async remove(@Param('id') id: string): Promise<void> {
    await this.assets.remove(id)
  }
}
