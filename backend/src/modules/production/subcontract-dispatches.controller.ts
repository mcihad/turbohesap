import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common'

import {
  ProductionPermissions,
  type SubcontractDispatchDto,
  type SubcontractStockRow,
} from '@turbohesap/shared'

import { RequirePermissions } from '../../common/decorators/permissions.decorator'
import {
  CreateSubcontractDispatchDto,
  ReceiveSubcontractDispatchDto,
  SubcontractDispatchListQueryDto,
  SubcontractStockQueryDto,
} from './dto/subcontract.dto'
import { SubcontractDispatchesService } from './subcontract-dispatches.service'

@Controller('production/subcontract-dispatches')
export class SubcontractDispatchesController {
  constructor(private readonly dispatches: SubcontractDispatchesService) {}

  @Get()
  @RequirePermissions(ProductionPermissions.read)
  list(@Query() query: SubcontractDispatchListQueryDto): Promise<SubcontractDispatchDto[]> {
    return this.dispatches.list(query)
  }

  @Get(':id')
  @RequirePermissions(ProductionPermissions.read)
  get(@Param('id') id: string): Promise<SubcontractDispatchDto> {
    return this.dispatches.get(id)
  }

  @Post()
  @RequirePermissions(ProductionPermissions.subcontractManage)
  create(@Body() dto: CreateSubcontractDispatchDto): Promise<SubcontractDispatchDto> {
    return this.dispatches.create(dto)
  }

  @Post(':id/send')
  @RequirePermissions(ProductionPermissions.subcontractManage)
  send(@Param('id') id: string): Promise<SubcontractDispatchDto> {
    return this.dispatches.send(id)
  }

  @Post(':id/receive')
  @RequirePermissions(ProductionPermissions.subcontractManage)
  receive(@Param('id') id: string, @Body() dto: ReceiveSubcontractDispatchDto): Promise<SubcontractDispatchDto> {
    return this.dispatches.receive(id, dto)
  }

  @Post(':id/cancel')
  @RequirePermissions(ProductionPermissions.subcontractManage)
  cancel(@Param('id') id: string): Promise<SubcontractDispatchDto> {
    return this.dispatches.cancel(id)
  }
}

@Controller('production/subcontract-stock')
export class SubcontractStockController {
  constructor(private readonly dispatches: SubcontractDispatchesService) {}

  @Get()
  @RequirePermissions(ProductionPermissions.read)
  stock(@Query() query: SubcontractStockQueryDto): Promise<SubcontractStockRow[]> {
    return this.dispatches.stockAtSubcontractor(query)
  }
}
