import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator'

import type { SettleInstrumentRequest } from '@turbohesap/shared'

// Body for `collect`/`pay` — mirrors `CreateInvoicePaymentDto`'s cash-XOR-bank
// shape (exactly one of `cashAccountId`/`bankAccountId`, validated in the
// service, not here — same precedent as `invoices`' payment DTO).
export class SettleInstrumentDto implements SettleInstrumentRequest {
  @IsOptional()
  @IsUUID()
  cashAccountId?: string | null

  @IsOptional()
  @IsUUID()
  bankAccountId?: string | null

  @IsString()
  @IsNotEmpty()
  date!: string

  @IsOptional()
  @IsString()
  description?: string | null
}
