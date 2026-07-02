import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common'

import {
  ProductionPermissions,
  type LotDto,
  type LotLinkDto,
  type LotTraceDto,
} from '@turbohesap/shared'

import { RequirePermissions } from '../../common/decorators/permissions.decorator'
import { CreateLotDto, LotListQueryDto, RegisterLotDto } from './dto/lot.dto'
import { LotsService } from './lots.service'

@Controller('production/lots')
export class LotsController {
  constructor(private readonly lots: LotsService) {}

  @Get()
  @RequirePermissions(ProductionPermissions.read)
  list(@Query() query: LotListQueryDto): Promise<LotDto[]> {
    return this.lots.list(query)
  }

  @Post()
  @RequirePermissions(ProductionPermissions.qualityManage)
  create(@Body() dto: CreateLotDto): Promise<LotDto> {
    return this.lots.create(dto)
  }

  @Post('consume')
  @RequirePermissions(ProductionPermissions.qualityManage)
  consume(@Body() dto: RegisterLotDto): Promise<LotLinkDto> {
    return this.lots.registerConsumption(dto)
  }

  @Post('produce')
  @RequirePermissions(ProductionPermissions.qualityManage)
  produce(@Body() dto: RegisterLotDto): Promise<LotLinkDto> {
    return this.lots.registerOutput(dto)
  }

  @Get(':id/trace')
  @RequirePermissions(ProductionPermissions.read)
  trace(@Param('id') id: string): Promise<LotTraceDto> {
    return this.lots.trace(id)
  }
}

@Controller('production/lot-links')
export class LotLinksController {
  constructor(private readonly lots: LotsService) {}

  @Get()
  @RequirePermissions(ProductionPermissions.read)
  list(@Query('manufacturingOrderId') manufacturingOrderId: string): Promise<LotLinkDto[]> {
    return this.lots.linksForOrder(manufacturingOrderId)
  }
}
