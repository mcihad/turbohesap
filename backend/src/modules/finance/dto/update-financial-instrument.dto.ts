import { IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator'

import type { UpdateFinancialInstrumentRequest } from '@turbohesap/shared'

// `instrumentType`/`direction` are immutable after creation — deliberately NOT
// a `PartialType(CreateFinancialInstrumentDto)` (that would keep them as
// accepted/whitelisted fields). Only mutable fields are declared here, so the
// global ValidationPipe's `forbidNonWhitelisted` rejects any attempt to change
// them with a 400, not a silent no-op.
export class UpdateFinancialInstrumentDto implements UpdateFinancialInstrumentRequest {
  @IsOptional()
  @IsUUID()
  branchId?: string | null

  @IsOptional()
  @IsUUID()
  contactId?: string

  @IsOptional()
  @IsNumber()
  @Min(0.01, { message: 'Tutar 0.01 den büyük olmalıdır' })
  amount?: number

  @IsOptional()
  @IsString()
  currencyCode?: string

  @IsOptional()
  @IsString()
  issueDate?: string

  @IsOptional()
  @IsString()
  dueDate?: string

  @IsOptional()
  @IsString()
  instrumentNo?: string

  @IsOptional()
  @IsString()
  bankName?: string | null

  @IsOptional()
  @IsString()
  bankBranch?: string | null

  @IsOptional()
  @IsString()
  accountNo?: string | null

  @IsOptional()
  @IsString()
  drawerName?: string | null

  @IsOptional()
  @IsString()
  notes?: string | null
}
