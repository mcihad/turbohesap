import { Type } from 'class-transformer'
import { IsIn, IsInt, IsOptional, IsString } from 'class-validator'

import type { FileKind, UploadFileMeta } from '@turbohesap/shared'

// The text fields that accompany a multipart upload (the binary parts are named
// `files` and handled by the interceptor). Multipart sends everything as strings,
// so sortOrder is coerced.
export class UploadFileDto implements UploadFileMeta {
  @IsOptional()
  @IsString()
  entityType?: string

  @IsOptional()
  @IsString()
  entityId?: string

  @IsOptional()
  @IsIn(['image', 'file'])
  kind?: FileKind

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number
}
