import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
} from '@nestjs/common'

import { InventoryPermissions, type StockMovementTypeDto } from '@turbohesap/shared'

import { RequirePermissions } from '../../common/decorators/permissions.decorator'
import { StockMovementTypesService } from './stock-movement-types.service'
import { CreateStockMovementTypeDto, UpdateStockMovementTypeDto } from './dto/stock-movement.dto'

@Controller('inventory/movement-types')
export class StockMovementTypesController {
  constructor(private readonly types: StockMovementTypesService) {}

  @Get()
  @RequirePermissions(InventoryPermissions.productsRead)
  list(): Promise<StockMovementTypeDto[]> {
    return this.types.list()
  }

  @Post()
  @RequirePermissions(InventoryPermissions.productsWrite)
  create(@Body() dto: CreateStockMovementTypeDto): Promise<StockMovementTypeDto> {
    return this.types.create(dto)
  }

  @Patch(':id')
  @RequirePermissions(InventoryPermissions.productsWrite)
  update(@Param('id') id: string, @Body() dto: UpdateStockMovementTypeDto): Promise<StockMovementTypeDto> {
    return this.types.update(id, dto)
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermissions(InventoryPermissions.productsWrite)
  async remove(@Param('id') id: string): Promise<void> {
    await this.types.remove(id)
  }
}
