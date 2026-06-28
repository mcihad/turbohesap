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
  PosPermissions,
  type PosFloorDto,
  type PosFloorLayoutDto,
  type PosTableDto,
} from '@turbohesap/shared'

import { RequirePermissions } from '../../common/decorators/permissions.decorator'
import { PosTablesService } from './pos-tables.service'
import {
  CreatePosFloorDto,
  CreatePosTableDto,
  UpdatePosFloorDto,
  UpdatePosTableDto,
} from './dto/pos-table.dto'

@Controller('pos')
export class PosTablesController {
  constructor(private readonly tables: PosTablesService) {}

  // Live floor map — cashiers need it for dine-in seating (gated by sell).
  @Get('floors/layout')
  @RequirePermissions(PosPermissions.sell)
  layout(@Query('branchId') branchId?: string): Promise<PosFloorLayoutDto[]> {
    return this.tables.layout(branchId)
  }

  // ── floors ──
  @Get('floors')
  @RequirePermissions(PosPermissions.tablesManage)
  listFloors(@Query('branchId') branchId?: string): Promise<PosFloorDto[]> {
    return this.tables.listFloors(branchId)
  }

  @Post('floors')
  @RequirePermissions(PosPermissions.tablesManage)
  createFloor(@Body() dto: CreatePosFloorDto): Promise<PosFloorDto> {
    return this.tables.createFloor(dto)
  }

  @Patch('floors/:id')
  @RequirePermissions(PosPermissions.tablesManage)
  updateFloor(@Param('id') id: string, @Body() dto: UpdatePosFloorDto): Promise<PosFloorDto> {
    return this.tables.updateFloor(id, dto)
  }

  @Delete('floors/:id')
  @HttpCode(204)
  @RequirePermissions(PosPermissions.tablesManage)
  async removeFloor(@Param('id') id: string): Promise<void> {
    await this.tables.removeFloor(id)
  }

  // ── tables ──
  @Get('tables')
  @RequirePermissions(PosPermissions.tablesManage)
  listTables(
    @Query('branchId') branchId?: string,
    @Query('floorId') floorId?: string,
  ): Promise<PosTableDto[]> {
    return this.tables.listTables({ branchId, floorId })
  }

  @Post('tables')
  @RequirePermissions(PosPermissions.tablesManage)
  createTable(@Body() dto: CreatePosTableDto): Promise<PosTableDto> {
    return this.tables.createTable(dto)
  }

  @Patch('tables/:id')
  @RequirePermissions(PosPermissions.tablesManage)
  updateTable(@Param('id') id: string, @Body() dto: UpdatePosTableDto): Promise<PosTableDto> {
    return this.tables.updateTable(id, dto)
  }

  @Delete('tables/:id')
  @HttpCode(204)
  @RequirePermissions(PosPermissions.tablesManage)
  async removeTable(@Param('id') id: string): Promise<void> {
    await this.tables.removeTable(id)
  }
}
