import { IsBoolean, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator'

import type {
  CreateLeaveRequestRequest,
  CreateLeaveTypeRequest,
  UpdateLeaveRequestRequest,
  UpdateLeaveTypeRequest,
} from '@turbohesap/shared'

export class CreateLeaveTypeDto implements CreateLeaveTypeRequest {
  @IsString() @IsNotEmpty() name!: string
  @IsOptional() @IsBoolean() paid?: boolean
  @IsOptional() @IsBoolean() affectsAnnualBalance?: boolean
  @IsOptional() @IsBoolean() isActive?: boolean
  @IsOptional() @IsInt() sortOrder?: number
}

export class UpdateLeaveTypeDto implements UpdateLeaveTypeRequest {
  @IsOptional() @IsString() @IsNotEmpty() name?: string
  @IsOptional() @IsBoolean() paid?: boolean
  @IsOptional() @IsBoolean() affectsAnnualBalance?: boolean
  @IsOptional() @IsBoolean() isActive?: boolean
  @IsOptional() @IsInt() sortOrder?: number
}

export class CreateLeaveRequestDto implements CreateLeaveRequestRequest {
  @IsString() @IsNotEmpty() employeeId!: string
  @IsString() @IsNotEmpty() leaveTypeId!: string
  @IsString() @IsNotEmpty() startDate!: string
  @IsString() @IsNotEmpty() endDate!: string
  @IsOptional() @IsNumber() @Min(0) days?: number
  @IsOptional() @IsString() reason?: string | null
}

export class UpdateLeaveRequestDto implements UpdateLeaveRequestRequest {
  @IsOptional() @IsString() @IsNotEmpty() leaveTypeId?: string
  @IsOptional() @IsString() startDate?: string
  @IsOptional() @IsString() endDate?: string
  @IsOptional() @IsNumber() @Min(0) days?: number
  @IsOptional() @IsString() reason?: string | null
}
