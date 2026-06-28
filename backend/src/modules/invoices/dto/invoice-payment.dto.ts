import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator'

import {
  PAYMENT_METHODS,
  type CreateInvoicePaymentRequest,
  type PaymentMethod,
} from '@turbohesap/shared'

export class CreateInvoicePaymentDto implements CreateInvoicePaymentRequest {
  @IsString() @IsNotEmpty() date!: string
  @IsNumber() @Min(0.01, { message: 'Tutar 0.01 den büyük olmalıdır' }) amount!: number
  @IsIn(PAYMENT_METHODS) method!: PaymentMethod
  @IsOptional() @IsString() cashAccountId?: string | null
  @IsOptional() @IsString() bankAccountId?: string | null
  @IsOptional() @IsString() description?: string | null
}
