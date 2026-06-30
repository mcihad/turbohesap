import { PartialType } from '@nestjs/swagger'
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator'

import type {
  CheckinTimeWindow,
  CreateCheckinAreaRequest,
  GeoJsonGeometry,
  SetAreaEmployeesRequest,
  UpdateCheckinAreaRequest,
} from '@turbohesap/shared'

// geom/timeWindows/attributes are validated structurally in the service (GeoJSON
// shape, HH:MM windows) — here we only enforce the coarse types.
export class CreateCheckinAreaDto implements CreateCheckinAreaRequest {
  @IsString()
  @IsNotEmpty()
  name!: string

  @IsOptional()
  @IsString()
  code?: string

  @IsOptional()
  @IsUUID()
  branchId?: string | null

  @IsOptional()
  @IsObject()
  geom?: GeoJsonGeometry | null

  @IsOptional()
  @IsInt()
  @Min(0)
  toleranceMeters?: number

  @IsOptional()
  @IsInt()
  @Min(0)
  minAccuracyMeters?: number

  @IsOptional()
  @IsArray()
  timeWindows?: CheckinTimeWindow[]

  @IsOptional()
  @IsObject()
  attributes?: Record<string, unknown>

  @IsOptional()
  @IsBoolean()
  requireInside?: boolean

  @IsOptional()
  @IsBoolean()
  allowMockLocation?: boolean

  @IsOptional()
  @IsBoolean()
  isActive?: boolean

  @IsOptional()
  @IsString()
  notes?: string | null
}

export class UpdateCheckinAreaDto
  extends PartialType(CreateCheckinAreaDto)
  implements UpdateCheckinAreaRequest {}

export class SetAreaEmployeesDto implements SetAreaEmployeesRequest {
  @IsArray()
  @IsUUID('all', { each: true })
  employeeIds!: string[]
}
