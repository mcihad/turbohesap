import { IsIn, IsOptional, IsString } from 'class-validator'

import type {
  ErrorLogStatus,
  UpdateErrorLogRequest,
} from '@turbohesap/shared'

const STATUSES: ErrorLogStatus[] = [
  'new',
  'investigating',
  'resolved',
  'ignored',
]

export class UpdateErrorLogDto implements UpdateErrorLogRequest {
  @IsOptional()
  @IsIn(STATUSES)
  status?: ErrorLogStatus

  @IsOptional()
  @IsString()
  developerNotes?: string
}
