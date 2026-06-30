import { PartialType } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator'

import type {
  CreateShiftRotationRequest,
  RotationDay,
  UpdateShiftRotationRequest,
} from '@turbohesap/shared'

export class RotationDayDto implements RotationDay {
  @IsInt()
  @Min(0)
  dayIndex!: number

  @IsOptional()
  @IsString()
  shiftId!: string | null

  @IsOptional()
  @IsString()
  teamLabel?: string | null
}

export class CreateShiftRotationDto implements CreateShiftRotationRequest {
  @IsString()
  @IsNotEmpty()
  name!: string

  @IsInt()
  @Min(1)
  cycleLengthDays!: number

  @IsString()
  anchorDate!: string

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RotationDayDto)
  days?: RotationDayDto[]

  @IsOptional()
  @IsString()
  description?: string | null

  @IsOptional()
  isActive?: boolean
}

export class UpdateShiftRotationDto
  extends PartialType(CreateShiftRotationDto)
  implements UpdateShiftRotationRequest {}
