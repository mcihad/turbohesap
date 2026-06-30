import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common'

import {
  InventoryPermissions,
  type AssetAssignmentDto,
} from '@turbohesap/shared'

import { RequirePermissions } from '../../common/decorators/permissions.decorator'
import {
  CurrentUser,
  type AuthUser,
} from '../../common/decorators/current-user.decorator'
import { AssignAssetDto, ReturnAssetDto } from './dto/asset-custody.dto'
import { AssetAssignmentListQueryDto } from './dto/asset-query.dto'
import { AssetCustodyService } from './asset-custody.service'

@Controller('inventory/asset-assignments')
export class AssetAssignmentsController {
  constructor(private readonly custody: AssetCustodyService) {}

  // Static segment declared before any param route.
  @Get('mine')
  @RequirePermissions(InventoryPermissions.assetsRead)
  mine(@CurrentUser() user: AuthUser): Promise<AssetAssignmentDto[]> {
    return this.custody.mine(user)
  }

  @Get()
  @RequirePermissions(InventoryPermissions.assetsRead)
  list(
    @Query() query: AssetAssignmentListQueryDto,
  ): Promise<AssetAssignmentDto[]> {
    return this.custody.listAssignments(query)
  }

  @Post()
  @RequirePermissions(InventoryPermissions.assetsAssign)
  assign(
    @Body() dto: AssignAssetDto,
    @CurrentUser() user: AuthUser,
  ): Promise<AssetAssignmentDto> {
    return this.custody.assign(dto, user)
  }

  @Post('return/:assetId')
  @RequirePermissions(InventoryPermissions.assetsAssign)
  returnAsset(
    @Param('assetId') assetId: string,
    @Body() dto: ReturnAssetDto,
  ): Promise<AssetAssignmentDto> {
    return this.custody.returnAsset(assetId, dto)
  }
}
