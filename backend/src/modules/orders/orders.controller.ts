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
  OrdersPermissions,
  type OrderDirection,
  type OrderDocumentDto,
  type OrderDocumentSummary,
  type OrderKind,
  type OrderListQuery,
  type OrderStatus,
} from '@turbohesap/shared'

import { RequirePermissions } from '../../common/decorators/permissions.decorator'
import { OrdersService } from './orders.service'
import {
  ConvertOrderDto,
  CreateOrderDocumentDto,
  UpdateOrderDocumentDto,
} from './dto/order.dto'

@Controller('orders/documents')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get()
  @RequirePermissions(OrdersPermissions.read)
  list(
    @Query('kind') kind?: OrderKind,
    @Query('direction') direction?: OrderDirection,
    @Query('status') status?: OrderStatus,
    @Query('contactId') contactId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('search') search?: string,
  ): Promise<OrderDocumentSummary[]> {
    const query: OrderListQuery = { kind, direction, status, contactId, from, to, search }
    return this.orders.list(query)
  }

  @Get(':id')
  @RequirePermissions(OrdersPermissions.read)
  get(@Param('id') id: string): Promise<OrderDocumentDto> {
    return this.orders.get(id)
  }

  @Post()
  @RequirePermissions(OrdersPermissions.write)
  create(@Body() dto: CreateOrderDocumentDto): Promise<OrderDocumentDto> {
    return this.orders.create(dto)
  }

  @Patch(':id')
  @RequirePermissions(OrdersPermissions.write)
  update(@Param('id') id: string, @Body() dto: UpdateOrderDocumentDto): Promise<OrderDocumentDto> {
    return this.orders.update(id, dto)
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermissions(OrdersPermissions.write)
  async remove(@Param('id') id: string): Promise<void> {
    await this.orders.remove(id)
  }

  @Post(':id/confirm')
  @RequirePermissions(OrdersPermissions.confirm)
  confirm(@Param('id') id: string): Promise<OrderDocumentDto> {
    return this.orders.confirm(id)
  }

  @Post(':id/convert')
  @RequirePermissions(OrdersPermissions.convert)
  convert(@Param('id') id: string, @Body() dto: ConvertOrderDto): Promise<OrderDocumentDto> {
    return this.orders.convert(id, dto)
  }

  @Post(':id/cancel')
  @RequirePermissions(OrdersPermissions.cancel)
  cancel(@Param('id') id: string): Promise<OrderDocumentDto> {
    return this.orders.cancel(id)
  }
}
