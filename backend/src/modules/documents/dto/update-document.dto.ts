import { PartialType } from '@nestjs/swagger'

import type { UpdateDocumentRequest } from '@turbohesap/shared'

import { CreateDocumentDto } from './create-document.dto'

export class UpdateDocumentDto
  extends PartialType(CreateDocumentDto)
  implements UpdateDocumentRequest {}
