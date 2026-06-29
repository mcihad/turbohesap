import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator'

import type {
  ComputePayrollRequest,
  CreatePayrollRunRequest,
  PayPayslipRequest,
  PayrollParams,
  UpsertPayrollParamsRequest,
} from '@turbohesap/shared'

export class CreatePayrollRunDto implements CreatePayrollRunRequest {
  @IsInt() @Min(2000) year!: number
  @IsInt() @Min(1) @Max(12) month!: number
  @IsOptional() @IsString() branchId?: string | null
  @IsOptional() @IsString() notes?: string | null
}

export class ComputePayrollDto implements ComputePayrollRequest {
  @IsOptional() @IsArray() @IsString({ each: true }) employeeIds?: string[]
}

export class PayPayslipDto implements PayPayslipRequest {
  @IsOptional() @IsString() cashAccountId?: string | null
  @IsOptional() @IsString() bankAccountId?: string | null
  @IsOptional() @IsString() date?: string
}

export class UpsertPayrollParamsDto implements UpsertPayrollParamsRequest {
  @IsInt() @Min(2000) year!: number
  // The shape is owned (and validated) by the shared engine; persisted as jsonb.
  @IsObject() @IsNotEmpty() params!: PayrollParams
}
