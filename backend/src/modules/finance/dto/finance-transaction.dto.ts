import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator'
import type { CreateFinanceTransactionRequest } from '@turbohesap/shared'

export class CreateFinanceTransactionDto implements CreateFinanceTransactionRequest {
  @IsOptional()
  @IsUUID()
  cashAccountId?: string | null

  @IsOptional()
  @IsUUID()
  bankAccountId?: string | null

  @IsOptional()
  @IsUUID()
  contactId?: string | null

  @IsEnum(['in', 'out'])
  type!: 'in' | 'out'

  @IsNumber()
  @Min(0.01, { message: 'Tutar 0.01 den büyük olmalıdır' })
  amount!: number

  @IsDateString()
  @IsNotEmpty()
  date!: string

  @IsOptional()
  @IsString()
  description?: string
}

export class UpdateFinanceTransactionDto {
  @IsOptional()
  @IsUUID()
  cashAccountId?: string | null

  @IsOptional()
  @IsUUID()
  bankAccountId?: string | null

  @IsOptional()
  @IsUUID()
  contactId?: string | null

  @IsOptional()
  @IsEnum(['in', 'out'])
  type?: 'in' | 'out'

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  amount?: number

  @IsOptional()
  @IsDateString()
  date?: string

  @IsOptional()
  @IsString()
  description?: string
}
