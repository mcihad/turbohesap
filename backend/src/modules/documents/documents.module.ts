import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { FileEntity } from '../files/entities/file.entity'
import { User } from '../iam/entities/user.entity'
import { IamModule } from '../iam/iam.module'
import { DocumentCategory } from './entities/document-category.entity'
import { Document } from './entities/document.entity'
import { DocumentCategoriesController } from './document-categories.controller'
import { DocumentCategoriesService } from './document-categories.service'
import { DocumentsController } from './documents.controller'
import { DocumentsTagsController } from './documents-tags.controller'
import { DocumentsService } from './documents.service'

// Evrak Yönetim Sistemi (document management) — categories (tree) + documents,
// süreli (time-bound) tracking, tags, jsonb attributes/metadata, and
// server-enforced privacy. Depends on `IamModule` (AccessService, for privacy
// enforcement) and reads `files`' FileEntity read/attach-only (per-document
// attachment counts) — the same pattern as `feedback.module.ts`. This module
// never depends on any *business* module (finance, contacts, inventory, …);
// they point AT a Document by id (`relatedEntityType`/`relatedEntityId`).
@Module({
  imports: [
    TypeOrmModule.forFeature([DocumentCategory, Document, FileEntity, User]),
    IamModule,
  ],
  controllers: [DocumentCategoriesController, DocumentsController, DocumentsTagsController],
  providers: [DocumentCategoriesService, DocumentsService],
  exports: [TypeOrmModule, DocumentsService],
})
export class DocumentsModule {}
