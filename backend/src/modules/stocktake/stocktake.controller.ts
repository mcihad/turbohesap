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
  StocktakePermissions,
  type StockCountDto,
  type StockCountKind,
  type StockCountLineDto,
  type StockCountListQuery,
  type StockCountScanDto,
  type StockCountStatus,
} from '@turbohesap/shared'

import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator'
import { RequirePermissions } from '../../common/decorators/permissions.decorator'
import { StocktakeService } from './stocktake.service'
import {
  CreateStockCountDto,
  SetCountLineDto,
  SubmitCountEntriesDto,
} from './dto/stocktake.dto'

@Controller('stocktake/counts')
export class StocktakeController {
  constructor(private readonly stocktake: StocktakeService) {}

  @Get()
  @RequirePermissions(StocktakePermissions.read)
  list(
    @Query('status') status?: StockCountStatus,
    @Query('kind') kind?: StockCountKind,
    @Query('branchId') branchId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ): Promise<StockCountDto[]> {
    const query: StockCountListQuery = { status, kind, branchId, from, to }
    return this.stocktake.list(query)
  }

  @Get(':id')
  @RequirePermissions(StocktakePermissions.read)
  get(@Param('id') id: string): Promise<StockCountDto> {
    return this.stocktake.get(id)
  }

  @Post()
  @RequirePermissions(StocktakePermissions.create)
  create(@Body() dto: CreateStockCountDto, @CurrentUser() user: AuthUser): Promise<StockCountDto> {
    return this.stocktake.create(dto, user.sub)
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermissions(StocktakePermissions.create)
  async remove(@Param('id') id: string): Promise<void> {
    await this.stocktake.remove(id)
  }

  @Post(':id/start')
  @RequirePermissions(StocktakePermissions.create)
  start(@Param('id') id: string): Promise<StockCountDto> {
    return this.stocktake.start(id)
  }

  @Get(':id/lines')
  @RequirePermissions(StocktakePermissions.read)
  lines(@Param('id') id: string): Promise<StockCountLineDto[]> {
    return this.stocktake.lineList(id)
  }

  @Get(':id/scans')
  @RequirePermissions(StocktakePermissions.read)
  scans(@Param('id') id: string): Promise<StockCountScanDto[]> {
    return this.stocktake.scanList(id)
  }

  @Post(':id/entries')
  @RequirePermissions(StocktakePermissions.count)
  submitEntries(
    @Param('id') id: string,
    @Body() dto: SubmitCountEntriesDto,
    @CurrentUser() user: AuthUser,
  ): Promise<StockCountLineDto[]> {
    return this.stocktake.submitEntries(id, dto, user.sub)
  }

  @Patch(':id/lines/:lineId')
  @RequirePermissions(StocktakePermissions.count)
  setLine(
    @Param('id') id: string,
    @Param('lineId') lineId: string,
    @Body() dto: SetCountLineDto,
  ): Promise<StockCountLineDto> {
    return this.stocktake.setLine(id, lineId, dto)
  }

  @Post(':id/review')
  @RequirePermissions(StocktakePermissions.review)
  review(@Param('id') id: string): Promise<StockCountDto> {
    return this.stocktake.review(id)
  }

  @Post(':id/lines/:lineId/recount')
  @RequirePermissions(StocktakePermissions.review)
  recount(@Param('id') id: string, @Param('lineId') lineId: string): Promise<StockCountLineDto> {
    return this.stocktake.requestRecount(id, lineId)
  }

  @Post(':id/approve')
  @RequirePermissions(StocktakePermissions.approve)
  approve(@Param('id') id: string, @CurrentUser() user: AuthUser): Promise<StockCountDto> {
    return this.stocktake.approve(id, user.sub)
  }

  @Post(':id/cancel')
  @RequirePermissions(StocktakePermissions.cancel)
  cancel(@Param('id') id: string): Promise<StockCountDto> {
    return this.stocktake.cancel(id)
  }
}
