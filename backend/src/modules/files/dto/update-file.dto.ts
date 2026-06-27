import { IsIn, IsInt, IsOptional, IsString, ValidateIf } from 'class-validator'

import type { FileKind, UpdateFileRequest } from '@turbohesap/shared'

export class UpdateFileDto implements UpdateFileRequest {
  @IsOptional()
  @IsInt()
  sortOrder?: number

  @IsOptional()
  @IsString()
  originalName?: string

  @IsOptional()
  @IsIn(['image', 'file'])
  kind?: FileKind

  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsString()
  entityType?: string | null

  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsString()
  entityId?: string | null
}
