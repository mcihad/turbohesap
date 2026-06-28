import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
} from '@nestjs/common'

import {
  InventoryPermissions,
  type ProductModifierGroupDto,
  type ProductModifierOptionDto,
} from '@turbohesap/shared'

import { RequirePermissions } from '../../common/decorators/permissions.decorator'
import { ProductModifiersService } from './product-modifiers.service'
import {
  CreateModifierGroupDto,
  CreateModifierOptionDto,
  SetProductModifiersDto,
  UpdateModifierGroupDto,
  UpdateModifierOptionDto,
} from './dto/product-modifier.dto'

@Controller('inventory')
export class ProductModifiersController {
  constructor(private readonly modifiers: ProductModifiersService) {}

  @Get('modifier-groups')
  @RequirePermissions(InventoryPermissions.modifiersRead)
  listGroups(): Promise<ProductModifierGroupDto[]> {
    return this.modifiers.listGroups()
  }

  @Get('modifier-groups/:id')
  @RequirePermissions(InventoryPermissions.modifiersRead)
  getGroup(@Param('id') id: string): Promise<ProductModifierGroupDto> {
    return this.modifiers.getGroup(id)
  }

  @Post('modifier-groups')
  @RequirePermissions(InventoryPermissions.modifiersWrite)
  createGroup(@Body() dto: CreateModifierGroupDto): Promise<ProductModifierGroupDto> {
    return this.modifiers.createGroup(dto)
  }

  @Patch('modifier-groups/:id')
  @RequirePermissions(InventoryPermissions.modifiersWrite)
  updateGroup(@Param('id') id: string, @Body() dto: UpdateModifierGroupDto): Promise<ProductModifierGroupDto> {
    return this.modifiers.updateGroup(id, dto)
  }

  @Delete('modifier-groups/:id')
  @HttpCode(204)
  @RequirePermissions(InventoryPermissions.modifiersWrite)
  async removeGroup(@Param('id') id: string): Promise<void> {
    await this.modifiers.removeGroup(id)
  }

  @Post('modifier-groups/:id/options')
  @RequirePermissions(InventoryPermissions.modifiersWrite)
  addOption(@Param('id') id: string, @Body() dto: CreateModifierOptionDto): Promise<ProductModifierOptionDto> {
    return this.modifiers.addOption(id, dto)
  }

  @Patch('modifier-groups/:id/options/:optionId')
  @RequirePermissions(InventoryPermissions.modifiersWrite)
  updateOption(
    @Param('id') id: string,
    @Param('optionId') optionId: string,
    @Body() dto: UpdateModifierOptionDto,
  ): Promise<ProductModifierOptionDto> {
    return this.modifiers.updateOption(id, optionId, dto)
  }

  @Delete('modifier-groups/:id/options/:optionId')
  @HttpCode(204)
  @RequirePermissions(InventoryPermissions.modifiersWrite)
  async removeOption(@Param('id') id: string, @Param('optionId') optionId: string): Promise<void> {
    await this.modifiers.removeOption(id, optionId)
  }

  // NOT under products/* — that path is owned by the products controller's
  // :id route, which would capture "modifier-map" as a productId (500). Drives
  // the POS "needs options sheet?" decision in one call.
  @Get('modifier-map')
  @RequirePermissions(InventoryPermissions.productsRead)
  productMap(): Promise<Record<string, string[]>> {
    return this.modifiers.productMap()
  }

  @Get('products/:productId/modifiers')
  @RequirePermissions(InventoryPermissions.productsRead)
  listForProduct(@Param('productId') productId: string): Promise<ProductModifierGroupDto[]> {
    return this.modifiers.listForProduct(productId)
  }

  @Put('products/:productId/modifiers')
  @RequirePermissions(InventoryPermissions.modifiersWrite)
  setForProduct(
    @Param('productId') productId: string,
    @Body() dto: SetProductModifiersDto,
  ): Promise<ProductModifierGroupDto[]> {
    return this.modifiers.setForProduct(productId, dto)
  }
}
