import { Transform } from 'class-transformer'
import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator'

import type {
  AttendanceDirection,
  AttendanceListQuery,
  AttendanceMethod,
  AttendanceStatus,
  CheckinAreaListQuery,
  EmployeeCardListQuery,
  ShiftAssignmentListQuery,
  ShiftDayListQuery,
  ShiftListQuery,
} from '@turbohesap/shared'

const toBool = () =>
  Transform(({ value }) =>
    value === undefined ? undefined : value === true || value === 'true',
  )

export class ShiftListQueryDto implements ShiftListQuery {
  @IsOptional()
  @IsString()
  branchId?: string

  @IsOptional()
  @toBool()
  @IsBoolean()
  isActive?: boolean
}

export class CheckinAreaListQueryDto implements CheckinAreaListQuery {
  @IsOptional()
  @IsString()
  branchId?: string

  @IsOptional()
  @toBool()
  @IsBoolean()
  isActive?: boolean

  @IsOptional()
  @IsString()
  employeeId?: string
}

export class ShiftAssignmentListQueryDto implements ShiftAssignmentListQuery {
  @IsOptional()
  @IsString()
  employeeId?: string

  @IsOptional()
  @IsString()
  rotationId?: string
}

export class ShiftDayListQueryDto implements ShiftDayListQuery {
  @IsOptional()
  @IsString()
  employeeId?: string

  @IsOptional()
  @IsString()
  from?: string

  @IsOptional()
  @IsString()
  to?: string
}

export class AttendanceListQueryDto implements AttendanceListQuery {
  @IsOptional()
  @IsString()
  employeeId?: string

  @IsOptional()
  @IsString()
  branchId?: string

  @IsOptional()
  @IsIn(['mobile_gps', 'card', 'web', 'manual'])
  method?: AttendanceMethod

  @IsOptional()
  @IsIn(['valid', 'flagged', 'rejected'])
  status?: AttendanceStatus

  @IsOptional()
  @IsIn(['in', 'out', 'unknown'])
  direction?: AttendanceDirection

  @IsOptional()
  @IsString()
  from?: string

  @IsOptional()
  @IsString()
  to?: string
}

export class EmployeeCardListQueryDto implements EmployeeCardListQuery {
  @IsOptional()
  @IsString()
  employeeId?: string

  @IsOptional()
  @IsString()
  cardNo?: string
}
