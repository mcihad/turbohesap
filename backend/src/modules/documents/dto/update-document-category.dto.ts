import { PartialType } from '@nestjs/swagger'

import type { UpdateDocumentCategoryRequest } from '@turbohesap/shared'

import { CreateDocumentCategoryDto } from './create-document-category.dto'

export class UpdateDocumentCategoryDto
  extends PartialType(CreateDocumentCategoryDto)
  implements UpdateDocumentCategoryRequest {}
