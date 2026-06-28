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
  type PosOrderDto,
  type PosOrderStatus,
} from '@turbohesap/shared'

import { RequirePermissions } from '../../common/decorators/permissions.decorator'
import { PosOrdersService } from './pos-orders.service'
import {
  AddPosPaymentDto,
  CreatePosOrderDto,
  SplitPosOrderDto,
  UpdatePosOrderDto,
  VoidPosOrderDto,
} from './dto/pos.dto'

@Controller('pos/orders')
export class PosOrdersController {
  constructor(private readonly orders: PosOrdersService) {}

  @Get()
  @RequirePermissions(PosPermissions.sell)
  list(
    @Query('registerId') registerId?: string,
    @Query('sessionId') sessionId?: string,
    @Query('status') status?: PosOrderStatus,
    @Query('contactId') contactId?: string,
  ): Promise<PosOrderDto[]> {
    return this.orders.list({ registerId, sessionId, status, contactId })
  }

  @Get(':id')
  @RequirePermissions(PosPermissions.sell)
  get(@Param('id') id: string): Promise<PosOrderDto> {
    return this.orders.get(id)
  }

  @Post()
  @RequirePermissions(PosPermissions.sell)
  create(@Body() dto: CreatePosOrderDto): Promise<PosOrderDto> {
    return this.orders.create(dto)
  }

  @Patch(':id')
  @RequirePermissions(PosPermissions.sell)
  update(@Param('id') id: string, @Body() dto: UpdatePosOrderDto): Promise<PosOrderDto> {
    return this.orders.update(id, dto)
  }

  @Post(':id/payments')
  @RequirePermissions(PosPermissions.sell)
  addPayment(@Param('id') id: string, @Body() dto: AddPosPaymentDto): Promise<PosOrderDto> {
    return this.orders.addPayment(id, dto)
  }

  @Delete(':id/payments/:paymentId')
  @RequirePermissions(PosPermissions.sell)
  removePayment(@Param('id') id: string, @Param('paymentId') paymentId: string): Promise<PosOrderDto> {
    return this.orders.removePayment(id, paymentId)
  }

  @Post(':id/settle')
  @RequirePermissions(PosPermissions.sell)
  settle(@Param('id') id: string): Promise<PosOrderDto> {
    return this.orders.settle(id)
  }

  @Post(':id/split')
  @RequirePermissions(PosPermissions.sell)
  split(@Param('id') id: string, @Body() dto: SplitPosOrderDto): Promise<PosOrderDto> {
    return this.orders.split(id, dto.lineIds)
  }

  @Post(':id/void')
  @RequirePermissions(PosPermissions.void)
  void(@Param('id') id: string, @Body() dto: VoidPosOrderDto): Promise<PosOrderDto> {
    return this.orders.void(id, dto)
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermissions(PosPermissions.sell)
  async remove(@Param('id') id: string): Promise<void> {
    await this.orders.remove(id)
  }
}
