import { PartialType } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import {
  IsArray,
  IsBoolean,
  IsHexColor,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Min,
  ValidateNested,
} from 'class-validator'

import type {
  CreateShiftRequest,
  ShiftBreak,
  UpdateShiftRequest,
} from '@turbohesap/shared'

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/

export class ShiftBreakDto implements ShiftBreak {
  @IsInt()
  @Min(0)
  startOffsetMin!: number

  @IsInt()
  @Min(0)
  durationMin!: number

  @IsBoolean()
  paid!: boolean

  @IsString()
  label!: string
}

export class CreateShiftDto implements CreateShiftRequest {
  @IsString()
  @IsNotEmpty()
  name!: string

  @IsOptional()
  @IsString()
  code?: string

  @Matches(HHMM, { message: 'startTime HH:MM olmalı' })
  startTime!: string

  @Matches(HHMM, { message: 'endTime HH:MM olmalı' })
  endTime!: string

  @IsOptional()
  @IsBoolean()
  crossesMidnight?: boolean

  @IsOptional()
  @IsInt()
  @Min(0)
  expectedMinutes?: number

  @IsOptional()
  @IsInt()
  @Min(0)
  lateGraceMin?: number

  @IsOptional()
  @IsInt()
  @Min(0)
  earlyLeaveGraceMin?: number

  @IsOptional()
  @IsInt()
  @Min(0)
  earlyInClampMin?: number

  @IsOptional()
  @IsHexColor()
  color?: string

  @IsOptional()
  @IsBoolean()
  isDayOff?: boolean

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ShiftBreakDto)
  breaks?: ShiftBreakDto[]

  @IsOptional()
  @IsString()
  branchId?: string | null

  @IsOptional()
  @IsBoolean()
  isActive?: boolean

  @IsOptional()
  @IsString()
  notes?: string | null
}

export class UpdateShiftDto
  extends PartialType(CreateShiftDto)
  implements UpdateShiftRequest {}
