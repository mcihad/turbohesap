import { IsNotEmpty, IsString } from 'class-validator'

import type { RenameDocumentTagRequest } from '@turbohesap/shared'

export class RenameDocumentTagDto implements RenameDocumentTagRequest {
  @IsString()
  @IsNotEmpty()
  from!: string

  @IsString()
  @IsNotEmpty()
  to!: string
}
