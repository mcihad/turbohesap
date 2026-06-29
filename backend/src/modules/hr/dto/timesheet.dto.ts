import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator'

import type { UpsertTimesheetRequest } from '@turbohesap/shared'

export class UpsertTimesheetDto implements UpsertTimesheetRequest {
  @IsString() @IsNotEmpty() employeeId!: string
  @IsInt() @Min(2000) year!: number
  @IsInt() @Min(1) @Max(12) month!: number
  @IsNumber() @Min(0) workedDays!: number
  @IsOptional() @IsNumber() @Min(0) weekendDays?: number
  @IsOptional() @IsNumber() @Min(0) holidayDays?: number
  @IsOptional() @IsNumber() @Min(0) overtimeHours?: number
  @IsOptional() @IsNumber() @Min(0) absentDays?: number
  @IsOptional() @IsNumber() @Min(0) paidLeaveDays?: number
  @IsOptional() @IsNumber() @Min(0) unpaidLeaveDays?: number
  @IsOptional() @IsString() notes?: string | null
}
