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

import { InventoryPermissions, type CategoryDto } from '@turbohesap/shared'

import { RequirePermissions } from '../../common/decorators/permissions.decorator'
import { CreateCategoryDto } from './dto/create-category.dto'
import { UpdateCategoryDto } from './dto/update-category.dto'
import { CategoriesService } from './categories.service'

@Controller('inventory/categories')
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Get()
  @RequirePermissions(InventoryPermissions.categoriesRead)
  list(): Promise<CategoryDto[]> {
    return this.categories.list()
  }

  @Get(':id')
  @RequirePermissions(InventoryPermissions.categoriesRead)
  get(@Param('id') id: string): Promise<CategoryDto> {
    return this.categories.get(id)
  }

  @Post()
  @RequirePermissions(InventoryPermissions.categoriesWrite)
  create(@Body() dto: CreateCategoryDto): Promise<CategoryDto> {
    return this.categories.create(dto)
  }

  @Patch(':id')
  @RequirePermissions(InventoryPermissions.categoriesWrite)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
  ): Promise<CategoryDto> {
    return this.categories.update(id, dto)
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermissions(InventoryPermissions.categoriesWrite)
  async remove(@Param('id') id: string): Promise<void> {
    await this.categories.remove(id)
  }
}
