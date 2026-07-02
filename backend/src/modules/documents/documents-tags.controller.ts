import { Controller, Delete, Get, HttpCode, Param, Post, Body } from '@nestjs/common'

import { DocumentsPermissions } from '@turbohesap/shared'

import { RequirePermissions } from '../../common/decorators/permissions.decorator'
import { RenameDocumentTagDto } from './dto/rename-document-tag.dto'
import { DocumentsService } from './documents.service'

// Bulk tag maintenance across ALL documents (regardless of privacy) — a
// deliberately elevated action, see `documents.service.ts` tag admin section.
@Controller('documents/tags')
export class DocumentsTagsController {
  constructor(private readonly documents: DocumentsService) {}

  @Get()
  @RequirePermissions(DocumentsPermissions.documentsRead)
  list(): Promise<string[]> {
    return this.documents.listDistinctTags()
  }

  @Post('rename')
  @RequirePermissions(DocumentsPermissions.tagsManage)
  async rename(@Body() dto: RenameDocumentTagDto): Promise<void> {
    await this.documents.renameTag(dto.from, dto.to)
  }

  @Delete(':tag')
  @HttpCode(204)
  @RequirePermissions(DocumentsPermissions.tagsManage)
  async remove(@Param('tag') tag: string): Promise<void> {
    await this.documents.deleteTag(tag)
  }
}
