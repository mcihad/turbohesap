import { PartialType } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator'

import type {
  AccessEvent,
  AttendanceImportRequest,
  CreateCardSourceRequest,
  CreateEmployeeCardRequest,
  UpdateCardSourceRequest,
  UpdateEmployeeCardRequest,
} from '@turbohesap/shared'

export class CreateCardSourceDto implements CreateCardSourceRequest {
  @IsString()
  @IsNotEmpty()
  name!: string

  @IsOptional()
  @IsString()
  code?: string

  @IsOptional()
  @IsString()
  kind?: string

  @IsOptional()
  @IsString()
  description?: string | null

  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>

  @IsOptional()
  @IsString()
  timezone?: string

  @IsOptional()
  @IsObject()
  directionMapping?: Record<string, 'in' | 'out' | 'unknown'>

  @IsOptional()
  @IsString()
  apiKey?: string

  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}

export class UpdateCardSourceDto
  extends PartialType(CreateCardSourceDto)
  implements UpdateCardSourceRequest {}

export class CreateEmployeeCardDto implements CreateEmployeeCardRequest {
  @IsUUID()
  employeeId!: string

  @IsString()
  @IsNotEmpty()
  cardNo!: string

  @IsOptional()
  @IsString()
  externalPersonnelId?: string | null

  @IsOptional()
  @IsString()
  validFrom?: string | null

  @IsOptional()
  @IsString()
  validTo?: string | null

  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}

export class UpdateEmployeeCardDto
  extends PartialType(CreateEmployeeCardDto)
  implements UpdateEmployeeCardRequest {}

// One event in an import batch. cardNo/personnelId/employeeRef optional; eventTime
// + deviceId required. Free-form raw kept for audit.
export class AccessEventDto implements AccessEvent {
  @IsOptional()
  @IsString()
  externalId?: string

  @IsOptional()
  @IsString()
  cardNo?: string

  @IsOptional()
  @IsString()
  personnelId?: string

  @IsOptional()
  @IsObject()
  employeeRef?: {
    byCardNo?: string
    byExternalPersonnelId?: string
    byTcKimlik?: string
  }

  @IsString()
  @IsNotEmpty()
  deviceId!: string

  @IsOptional()
  @IsString()
  terminalId?: string

  @IsOptional()
  @IsString()
  gateId?: string

  @IsOptional()
  @IsString()
  readerId?: string

  @IsOptional()
  @IsString()
  direction?: 'in' | 'out' | 'unknown'

  @IsString()
  @IsNotEmpty()
  eventTime!: string

  @IsOptional()
  @IsString()
  eventType?: 'attendance' | 'access_granted' | 'access_denied' | 'door'

  @IsOptional()
  @IsString()
  verifyMode?: string

  @IsOptional()
  @IsObject()
  raw?: Record<string, unknown>
}

export class AttendanceImportDto implements AttendanceImportRequest {
  @IsString()
  @IsNotEmpty()
  source!: string

  @IsOptional()
  @IsString()
  deviceId?: string

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AccessEventDto)
  events!: AccessEventDto[]
}
