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
  InventoryPermissions,
  type UomCategoryDto,
  type UomConvertResult,
  type UomDto,
} from '@turbohesap/shared'

import { RequirePermissions } from '../../common/decorators/permissions.decorator'
import {
  CreateUomCategoryDto,
  CreateUomDto,
  UomConvertDto,
  UpdateUomCategoryDto,
  UpdateUomDto,
} from './dto/uom.dto'
import { UomService } from './uom.service'

@Controller('inventory/uom-categories')
export class UomCategoriesController {
  constructor(private readonly uom: UomService) {}

  @Get()
  @RequirePermissions(InventoryPermissions.uomRead)
  list(): Promise<UomCategoryDto[]> {
    return this.uom.listCategories()
  }

  @Post()
  @RequirePermissions(InventoryPermissions.uomWrite)
  create(@Body() dto: CreateUomCategoryDto): Promise<UomCategoryDto> {
    return this.uom.createCategory(dto)
  }

  @Patch(':id')
  @RequirePermissions(InventoryPermissions.uomWrite)
  update(@Param('id') id: string, @Body() dto: UpdateUomCategoryDto): Promise<UomCategoryDto> {
    return this.uom.updateCategory(id, dto)
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermissions(InventoryPermissions.uomWrite)
  async remove(@Param('id') id: string): Promise<void> {
    await this.uom.removeCategory(id)
  }
}

@Controller('inventory/uoms')
export class UomsController {
  constructor(private readonly uom: UomService) {}

  // Static route before :id.
  @Post('convert')
  @RequirePermissions(InventoryPermissions.uomRead)
  convert(@Body() dto: UomConvertDto): Promise<UomConvertResult> {
    return this.uom.convert(dto)
  }

  @Get()
  @RequirePermissions(InventoryPermissions.uomRead)
  list(@Query('categoryId') categoryId?: string): Promise<UomDto[]> {
    return this.uom.list(categoryId)
  }

  @Post()
  @RequirePermissions(InventoryPermissions.uomWrite)
  create(@Body() dto: CreateUomDto): Promise<UomDto> {
    return this.uom.create(dto)
  }

  @Patch(':id')
  @RequirePermissions(InventoryPermissions.uomWrite)
  update(@Param('id') id: string, @Body() dto: UpdateUomDto): Promise<UomDto> {
    return this.uom.update(id, dto)
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermissions(InventoryPermissions.uomWrite)
  async remove(@Param('id') id: string): Promise<void> {
    await this.uom.remove(id)
  }
}
