import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common'

import {
  InventoryPermissions,
  type AssetTransferDto,
} from '@turbohesap/shared'

import { RequirePermissions } from '../../common/decorators/permissions.decorator'
import {
  CurrentUser,
  type AuthUser,
} from '../../common/decorators/current-user.decorator'
import {
  AcceptTransferDto,
  InitiateTransferDto,
} from './dto/asset-custody.dto'
import { AssetTransferListQueryDto } from './dto/asset-query.dto'
import { AssetCustodyService } from './asset-custody.service'

@Controller('inventory/asset-transfers')
export class AssetTransfersController {
  constructor(private readonly custody: AssetCustodyService) {}

  // Static segments (by-token, accept) declared before the :id param routes so
  // they are not shadowed.
  @Get('by-token/:token')
  @RequirePermissions(InventoryPermissions.assetsRead)
  byToken(@Param('token') token: string): Promise<AssetTransferDto> {
    return this.custody.byToken(token)
  }

  @Get()
  @RequirePermissions(InventoryPermissions.assetsRead)
  list(
    @Query() query: AssetTransferListQueryDto,
    @CurrentUser() user: AuthUser,
  ): Promise<AssetTransferDto[]> {
    return this.custody.listTransfers(query, user)
  }

  @Post()
  @RequirePermissions(InventoryPermissions.assetsAssign)
  initiate(
    @Body() dto: InitiateTransferDto,
    @CurrentUser() user: AuthUser,
  ): Promise<AssetTransferDto> {
    return this.custody.initiate(dto, user)
  }

  @Post('accept')
  @RequirePermissions(InventoryPermissions.assetsAssign)
  accept(
    @Body() dto: AcceptTransferDto,
    @CurrentUser() user: AuthUser,
  ): Promise<AssetTransferDto> {
    return this.custody.accept(dto, user)
  }

  @Get(':id')
  @RequirePermissions(InventoryPermissions.assetsRead)
  get(@Param('id') id: string): Promise<AssetTransferDto> {
    return this.custody.getTransfer(id)
  }

  @Post(':id/reject')
  @RequirePermissions(InventoryPermissions.assetsAssign)
  reject(@Param('id') id: string): Promise<AssetTransferDto> {
    return this.custody.reject(id)
  }

  @Post(':id/cancel')
  @RequirePermissions(InventoryPermissions.assetsAssign)
  cancel(@Param('id') id: string): Promise<AssetTransferDto> {
    return this.custody.cancel(id)
  }
}
