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

import { DocumentsPermissions, type DocumentCategoryDto } from '@turbohesap/shared'

import { type AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator'
import { RequirePermissions } from '../../common/decorators/permissions.decorator'
import { CreateDocumentCategoryDto } from './dto/create-document-category.dto'
import { UpdateDocumentCategoryDto } from './dto/update-document-category.dto'
import { DocumentCategoriesService } from './document-categories.service'

@Controller('documents/categories')
export class DocumentCategoriesController {
  constructor(private readonly categories: DocumentCategoriesService) {}

  @Get()
  @RequirePermissions(DocumentsPermissions.categoriesRead)
  list(@CurrentUser() user: AuthUser): Promise<DocumentCategoryDto[]> {
    return this.categories.list(user.sub)
  }

  @Get(':id')
  @RequirePermissions(DocumentsPermissions.categoriesRead)
  get(@Param('id') id: string, @CurrentUser() user: AuthUser): Promise<DocumentCategoryDto> {
    return this.categories.get(id, user.sub)
  }

  @Post()
  @RequirePermissions(DocumentsPermissions.categoriesWrite)
  create(
    @Body() dto: CreateDocumentCategoryDto,
    @CurrentUser() user: AuthUser,
  ): Promise<DocumentCategoryDto> {
    return this.categories.create(dto, user.sub)
  }

  @Patch(':id')
  @RequirePermissions(DocumentsPermissions.categoriesWrite)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateDocumentCategoryDto,
    @CurrentUser() user: AuthUser,
  ): Promise<DocumentCategoryDto> {
    return this.categories.update(id, dto, user.sub)
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermissions(DocumentsPermissions.categoriesWrite)
  async remove(@Param('id') id: string, @CurrentUser() user: AuthUser): Promise<void> {
    await this.categories.remove(id, user.sub)
  }
}
