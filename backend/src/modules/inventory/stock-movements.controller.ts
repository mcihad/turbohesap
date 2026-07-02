import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
} from '@nestjs/common'

import { InventoryPermissions, type Page, type StockMovementDto } from '@turbohesap/shared'

import { RequirePermissions } from '../../common/decorators/permissions.decorator'
import { StockMovementsService } from './stock-movements.service'
import { CreateStockMovementDto } from './dto/stock-movement.dto'
import { StockMovementListQueryDto } from './dto/stock-movement-list-query.dto'

@Controller('inventory/stock-movements')
export class StockMovementsController {
  constructor(private readonly movements: StockMovementsService) {}

  @Get()
  @RequirePermissions(InventoryPermissions.productsRead)
  list(
    @Query('productId') productId?: string,
    @Query('branchId') branchId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ): Promise<StockMovementDto[]> {
    return this.movements.list({ productId, branchId, from, to })
  }

  @Get('paged')
  @RequirePermissions(InventoryPermissions.productsRead)
  listPage(@Query() query: StockMovementListQueryDto): Promise<Page<StockMovementDto>> {
    return this.movements.listPage(query)
  }

  @Post()
  @RequirePermissions(InventoryPermissions.productsStock)
  create(@Body() dto: CreateStockMovementDto): Promise<StockMovementDto> {
    return this.movements.create(dto)
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermissions(InventoryPermissions.productsStock)
  async remove(@Param('id') id: string): Promise<void> {
    await this.movements.remove(id)
  }
}
