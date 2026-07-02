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
  DocumentsPermissions,
  type DocumentDto,
  type DocumentExpiryStatus,
  type DocumentListQuery,
} from '@turbohesap/shared'

import { type AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator'
import { RequirePermissions } from '../../common/decorators/permissions.decorator'
import { CreateDocumentDto } from './dto/create-document.dto'
import { UpdateDocumentDto } from './dto/update-document.dto'
import { DocumentsService } from './documents.service'

@Controller('documents/documents')
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @Get()
  @RequirePermissions(DocumentsPermissions.documentsRead)
  list(
    @CurrentUser() user: AuthUser,
    @Query('categoryId') categoryId?: string,
    @Query('tag') tag?: string,
    @Query('isPrivate') isPrivate?: string,
    @Query('mine') mine?: string,
    @Query('expiryStatus') expiryStatus?: DocumentExpiryStatus,
    @Query('relatedEntityType') relatedEntityType?: string,
    @Query('relatedEntityId') relatedEntityId?: string,
    @Query('search') search?: string,
  ): Promise<DocumentDto[]> {
    const query: DocumentListQuery = {
      categoryId,
      tag,
      isPrivate: isPrivate === undefined ? undefined : isPrivate === 'true',
      mine: mine === 'true',
      expiryStatus,
      relatedEntityType,
      relatedEntityId,
      search,
    }
    return this.documents.list(query, user.sub)
  }

  @Get(':id')
  @RequirePermissions(DocumentsPermissions.documentsRead)
  get(@Param('id') id: string, @CurrentUser() user: AuthUser): Promise<DocumentDto> {
    return this.documents.get(id, user.sub)
  }

  @Post()
  @RequirePermissions(DocumentsPermissions.documentsWrite)
  create(@Body() dto: CreateDocumentDto, @CurrentUser() user: AuthUser): Promise<DocumentDto> {
    return this.documents.create(dto, user.sub)
  }

  @Patch(':id')
  @RequirePermissions(DocumentsPermissions.documentsWrite)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateDocumentDto,
    @CurrentUser() user: AuthUser,
  ): Promise<DocumentDto> {
    return this.documents.update(id, dto, user.sub)
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermissions(DocumentsPermissions.documentsDelete)
  async remove(@Param('id') id: string, @CurrentUser() user: AuthUser): Promise<void> {
    await this.documents.remove(id, user.sub)
  }
}
