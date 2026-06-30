import { PartialType } from '@nestjs/swagger'
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator'

import type {
  AssignEmployeeShiftRequest,
  GenerateScheduleRequest,
  SetShiftDayRequest,
  ShiftDayStatus,
  UpdateEmployeeShiftRequest,
} from '@turbohesap/shared'

export class AssignEmployeeShiftDto implements AssignEmployeeShiftRequest {
  @IsUUID()
  employeeId!: string

  @IsOptional()
  @IsUUID()
  rotationId?: string | null

  @IsOptional()
  @IsInt()
  @Min(0)
  rotationOffset?: number

  @IsOptional()
  @IsUUID()
  fixedShiftId?: string | null

  @IsString()
  effectiveFrom!: string

  @IsOptional()
  @IsString()
  effectiveTo?: string | null
}

export class UpdateEmployeeShiftDto
  extends PartialType(AssignEmployeeShiftDto)
  implements UpdateEmployeeShiftRequest {}

export class GenerateScheduleDto implements GenerateScheduleRequest {
  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  employeeIds?: string[]

  @IsString()
  from!: string

  @IsString()
  to!: string

  @IsOptional()
  @IsBoolean()
  overwriteManual?: boolean

  @IsOptional()
  @IsBoolean()
  publish?: boolean
}

export class SetShiftDayDto implements SetShiftDayRequest {
  @IsUUID()
  employeeId!: string

  @IsString()
  workDate!: string

  @IsOptional()
  @IsUUID()
  shiftId!: string | null

  @IsOptional()
  @IsIn(['draft', 'published'])
  status?: ShiftDayStatus
}
