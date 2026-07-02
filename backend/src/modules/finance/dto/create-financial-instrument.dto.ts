import {
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator'

import {
  INSTRUMENT_DIRECTIONS,
  INSTRUMENT_TYPES,
  type CreateFinancialInstrumentRequest,
  type InstrumentDirection,
  type InstrumentType,
} from '@turbohesap/shared'

export class CreateFinancialInstrumentDto implements CreateFinancialInstrumentRequest {
  @IsIn(INSTRUMENT_TYPES)
  instrumentType!: InstrumentType

  @IsIn(INSTRUMENT_DIRECTIONS)
  direction!: InstrumentDirection

  @IsOptional()
  @IsUUID()
  branchId?: string | null

  @IsUUID()
  contactId!: string

  @IsNumber()
  @Min(0.01, { message: 'Tutar 0.01 den büyük olmalıdır' })
  amount!: number

  @IsOptional()
  @IsString()
  currencyCode?: string

  @IsString()
  @IsNotEmpty()
  issueDate!: string

  @IsString()
  @IsNotEmpty()
  dueDate!: string

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
