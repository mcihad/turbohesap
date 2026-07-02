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

import { ProductionPermissions, type ManufacturingOrderDto } from '@turbohesap/shared'

import { RequirePermissions } from '../../common/decorators/permissions.decorator'
import {
  CompleteManufacturingOrderDto,
  CreateFromDemandDto,
  CreateManufacturingOrderDto,
  ManufacturingOrderListQueryDto,
  UpdateManufacturingOrderDto,
} from './dto/manufacturing-order.dto'
import { ManufacturingOrdersService } from './manufacturing-orders.service'

@Controller('production/orders')
export class ManufacturingOrdersController {
  constructor(private readonly orders: ManufacturingOrdersService) {}

  @Get()
  @RequirePermissions(ProductionPermissions.read)
  list(@Query() query: ManufacturingOrderListQueryDto): Promise<ManufacturingOrderDto[]> {
    return this.orders.list(query)
  }

  @Get(':id')
  @RequirePermissions(ProductionPermissions.read)
  get(@Param('id') id: string): Promise<ManufacturingOrderDto> {
    return this.orders.get(id)
  }

  @Post()
  @RequirePermissions(ProductionPermissions.ordersWrite)
  create(@Body() dto: CreateManufacturingOrderDto): Promise<ManufacturingOrderDto> {
    return this.orders.create(dto)
  }

  // Static route before :id — make-to-order from a sales demand line.
  @Post('from-demand')
  @RequirePermissions(ProductionPermissions.ordersWrite)
  createFromDemand(@Body() dto: CreateFromDemandDto): Promise<ManufacturingOrderDto> {
    return this.orders.createFromDemand(dto)
  }

  @Patch(':id')
  @RequirePermissions(ProductionPermissions.ordersWrite)
  update(@Param('id') id: string, @Body() dto: UpdateManufacturingOrderDto): Promise<ManufacturingOrderDto> {
    return this.orders.update(id, dto)
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermissions(ProductionPermissions.ordersWrite)
  async remove(@Param('id') id: string): Promise<void> {
    await this.orders.remove(id)
  }

  @Post(':id/confirm')
  @RequirePermissions(ProductionPermissions.ordersConfirm)
  confirm(@Param('id') id: string): Promise<ManufacturingOrderDto> {
    return this.orders.confirm(id)
  }

  @Post(':id/complete')
  @RequirePermissions(ProductionPermissions.ordersComplete)
  complete(@Param('id') id: string, @Body() dto: CompleteManufacturingOrderDto): Promise<ManufacturingOrderDto> {
    return this.orders.complete(id, dto)
  }

  @Post(':id/cancel')
  @RequirePermissions(ProductionPermissions.ordersCancel)
  cancel(@Param('id') id: string): Promise<ManufacturingOrderDto> {
    return this.orders.cancel(id)
  }
}
