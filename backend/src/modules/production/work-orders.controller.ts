import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common'

import { ProductionPermissions, type WorkOrderDto } from '@turbohesap/shared'

import { RequirePermissions } from '../../common/decorators/permissions.decorator'
import {
  FinishWorkOrderDto,
  StartWorkOrderDto,
  WorkOrderListQueryDto,
} from './dto/work-order.dto'
import { WorkOrdersService } from './work-orders.service'

@Controller('production/work-orders')
export class WorkOrdersController {
  constructor(private readonly workOrders: WorkOrdersService) {}

  @Get()
  @RequirePermissions(ProductionPermissions.read)
  list(@Query() query: WorkOrderListQueryDto): Promise<WorkOrderDto[]> {
    return this.workOrders.list(query)
  }

  @Get(':id')
  @RequirePermissions(ProductionPermissions.read)
  get(@Param('id') id: string): Promise<WorkOrderDto> {
    return this.workOrders.get(id)
  }

  @Post(':id/start')
  @RequirePermissions(ProductionPermissions.workordersExecute)
  start(@Param('id') id: string, @Body() dto: StartWorkOrderDto): Promise<WorkOrderDto> {
    return this.workOrders.start(id, dto)
  }

  @Post(':id/pause')
  @RequirePermissions(ProductionPermissions.workordersExecute)
  pause(@Param('id') id: string): Promise<WorkOrderDto> {
    return this.workOrders.pause(id)
  }

  @Post(':id/resume')
  @RequirePermissions(ProductionPermissions.workordersExecute)
  resume(@Param('id') id: string, @Body() dto: StartWorkOrderDto): Promise<WorkOrderDto> {
    return this.workOrders.resume(id, dto)
  }

  @Post(':id/finish')
  @RequirePermissions(ProductionPermissions.workordersExecute)
  finish(@Param('id') id: string, @Body() dto: FinishWorkOrderDto): Promise<WorkOrderDto> {
    return this.workOrders.finish(id, dto)
  }
}
