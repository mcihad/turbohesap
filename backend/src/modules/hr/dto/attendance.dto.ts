import { PartialType } from '@nestjs/swagger'
import {
  IsBoolean,
  IsIn,
  IsLatitude,
  IsLongitude,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator'

import type {
  AttendanceDirection,
  AttendanceMethod,
  CheckinRequest,
  CreateAttendanceRequest,
  UpdateAttendanceRequest,
} from '@turbohesap/shared'

const DIRECTIONS: AttendanceDirection[] = ['in', 'out', 'unknown']
const METHODS: AttendanceMethod[] = ['mobile_gps', 'card', 'web', 'manual']

export class CheckinDto implements CheckinRequest {
  @IsIn(DIRECTIONS)
  direction!: AttendanceDirection

  @IsLatitude()
  lat!: number

  @IsLongitude()
  lng!: number

  @IsOptional()
  @IsNumber()
  @Min(0)
  accuracyMeters?: number

  @IsOptional()
  @IsBoolean()
  isMockLocation?: boolean

  @IsOptional()
  @IsObject()
  deviceInfo?: Record<string, unknown>

  @IsOptional()
  @IsString()
  notes?: string | null
}

export class CreateAttendanceDto implements CreateAttendanceRequest {
  @IsUUID()
  employeeId!: string

  @IsString()
  eventTime!: string

  @IsIn(DIRECTIONS)
  direction!: AttendanceDirection

  @IsOptional()
  @IsIn(METHODS)
  method?: AttendanceMethod

  @IsOptional()
  @IsNumber()
  lat?: number | null

  @IsOptional()
  @IsNumber()
  lng?: number | null

  @IsOptional()
  @IsUUID()
  areaId?: string | null

  @IsOptional()
  @IsString()
  notes?: string | null
}

export class UpdateAttendanceDto
  extends PartialType(CreateAttendanceDto)
  implements UpdateAttendanceRequest {}
